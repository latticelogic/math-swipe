import StoreKit

/// StoreKit 2 billing — the iOS analogue of android-native's BillingBridge.
///
/// Contract with the web side (src/utils/checkout.ts):
///   buy(sku)     → on success emits window.__mcOnPurchase(<signed JWS>) —
///                  the raw signed-transaction JWS, which the web hands to the
///                  verifyAppleTransaction callable. The SERVER verifies the
///                  Apple signature chain and grants; the device's word is
///                  never trusted (same principle as Play).
///   restore(sku) → same callbacks; empty token = nothing to restore.
///   finish(id)   → called by the web AFTER server verification succeeds.
///                  Until then the transaction stays unfinished, so StoreKit
///                  re-delivers it via Transaction.updates on next launch —
///                  the exact analogue of "unacknowledged Play purchases
///                  auto-refund": a failed verification can never silently
///                  keep the user's money.
@MainActor
final class BillingBridge {
    static let sku = "pro_lifetime"   // must match the App Store Connect product id

    private var product: Product?
    private(set) var isReady = false
    private var updatesTask: Task<Void, Never>?

    private let emitJs: (String) -> Void
    private let readinessChanged: () -> Void

    init(emitJs: @escaping (String) -> Void, readinessChanged: @escaping () -> Void) {
        self.emitJs = emitJs
        self.readinessChanged = readinessChanged
    }

    func start() {
        // Long-lived listener: out-of-app purchases, Ask-to-Buy approvals, and
        // any transaction left unfinished by an interrupted verification get
        // re-delivered here → hand to the web to (re)verify.
        updatesTask = Task { [weak self] in
            for await update in Transaction.updates {
                self?.emitPurchase(update.jwsRepresentation)
            }
        }
        Task { await loadProduct() }
    }

    func loadProduct() async {
        do {
            product = try await Product.products(for: [Self.sku]).first
        } catch {
            product = nil
        }
        isReady = product != nil
        readinessChanged()
    }

    func buy() {
        Task { await doBuy() }
    }

    private func doBuy() async {
        guard let product else { emitError("native billing not ready"); return }
        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                // Send the JWS regardless of the DEVICE verification outcome —
                // the server performs the authoritative check either way.
                emitPurchase(verification.jwsRepresentation)
            case .userCancelled:
                emitError("cancelled")
            case .pending:
                // Ask-to-Buy etc. — resolves later via Transaction.updates.
                emitError("pending")
            @unknown default:
                emitError("unknown purchase result")
            }
        } catch {
            emitError(error.localizedDescription)
        }
    }

    func restore() {
        Task {
            for await entitlement in Transaction.currentEntitlements {
                let productId: String
                switch entitlement {
                case .verified(let t): productId = t.productID
                case .unverified(let t, _): productId = t.productID
                }
                if productId == Self.sku {
                    emitPurchase(entitlement.jwsRepresentation)
                    return
                }
            }
            emitPurchase("")   // empty → web treats as nothing to restore
        }
    }

    /// Finish a transaction AFTER the server has verified + granted. Looks in
    /// both unfinished and current-entitlement sets (restores re-deliver from
    /// the latter).
    func finish(transactionId: String) {
        Task {
            for await unfinished in Transaction.unfinished {
                if case .verified(let t) = unfinished, String(t.id) == transactionId {
                    await t.finish()
                    return
                }
            }
            for await entitlement in Transaction.currentEntitlements {
                if case .verified(let t) = entitlement, String(t.id) == transactionId {
                    await t.finish()
                    return
                }
            }
        }
    }

    func dispose() { updatesTask?.cancel() }

    private func emitPurchase(_ jws: String) {
        emitJs("window.__mcOnPurchase && window.__mcOnPurchase(\(Self.jsString(jws)))")
    }
    private func emitError(_ message: String) {
        emitJs("window.__mcOnPurchaseError && window.__mcOnPurchaseError(\(Self.jsString(message)))")
    }

    static func jsString(_ s: String) -> String {
        let escaped = s
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\"", with: "\\\"")
            .replacingOccurrences(of: "\n", with: "\\n")
        return "\"\(escaped)\""
    }
}
