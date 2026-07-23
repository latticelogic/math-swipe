package app.mathchallenge.twa

import android.webkit.JavascriptInterface
import androidx.activity.ComponentActivity
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams

/**
 * The native Play Billing integration, exposed to the web app as
 * `window.AndroidBilling` (see MainActivity.addJavascriptInterface). This is
 * the whole reason for going native: com.android.billingclient:8 called
 * DIRECTLY — no Digital Goods API, no android-browser-helper, no Chrome-version
 * gate, and PBL 8 is available today.
 *
 * Contract with the web side (src/utils/checkout.ts):
 *   - isReady(): billing connected AND product loaded.
 *   - buy(sku): launches the flow; result reported by calling back into JS via
 *     window.__mcOnPurchase(token) / window.__mcOnPurchaseError(message).
 *   - restore(sku): same callbacks; empty token → JS treats as "nothing to restore".
 *
 * IMPORTANT: we deliberately do NOT acknowledge purchases here. The web side
 * hands the token to verifyPlayPurchase, which acknowledges server-side (same
 * as the old Digital Goods path). If verification fails, Play auto-refunds the
 * unacknowledged purchase within 3 days — the user is never silently charged.
 *
 * NOTE: exact PBL-8 method signatures (esp. queryProductDetailsAsync's result
 * type) are validated by the first CI build; adjust there if the compiler flags
 * a v8 API delta. The logic and flow are the contract.
 */
class BillingBridge(
    private val activity: ComponentActivity,
    private val evaluateJs: (String) -> Unit,
) {
    private val sku = "pro_lifetime"   // must match PLAY_SKU / Play Console product id
    @Volatile private var productDetails: ProductDetails? = null
    @Volatile private var connected = false

    private val purchasesListener = com.android.billingclient.api.PurchasesUpdatedListener { result, purchases ->
        when {
            result.responseCode == BillingClient.BillingResponseCode.OK && purchases != null -> {
                val token = purchases.firstOrNull { sku in it.products }?.purchaseToken
                if (token != null) onPurchase(token) else onError("No purchase token")
            }
            result.responseCode == BillingClient.BillingResponseCode.USER_CANCELED -> onError("cancelled")
            else -> onError("Billing error ${result.responseCode}")
        }
    }

    private val client: BillingClient = BillingClient.newBuilder(activity)
        .setListener(purchasesListener)
        .enablePendingPurchases(
            PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()
        )
        .build()

    /** (Re)connect the BillingClient and load the product. Safe to call repeatedly. */
    fun connect() {
        if (connected) { loadProduct(); return }
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                connected = result.responseCode == BillingClient.BillingResponseCode.OK
                if (connected) loadProduct()
            }
            override fun onBillingServiceDisconnected() { connected = false }
        })
    }

    private fun loadProduct() {
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(listOf(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(sku)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build()
            ))
            .build()
        client.queryProductDetailsAsync(params) { _, result ->
            // v7: result is List<ProductDetails>; v8: QueryProductDetailsResult
            // (.productDetailsList). Handle whichever the pinned lib exposes at
            // compile time — see NOTE in the class doc.
            productDetails = extractFirstProduct(result)
        }
    }

    @JavascriptInterface
    fun isReady(): Boolean = connected && productDetails != null

    @JavascriptInterface
    fun buy(sku: String) {
        val pd = productDetails
        if (!connected || pd == null) { onError("native billing not ready"); return }
        val flowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(
                BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(pd)
                    .build()
            ))
            .build()
        // launchBillingFlow must run on the UI thread; @JavascriptInterface
        // calls arrive on a binder thread.
        activity.runOnUiThread { client.launchBillingFlow(activity, flowParams) }
    }

    @JavascriptInterface
    fun restore(sku: String) {
        if (!connected) { onError("native billing not ready"); return }
        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP)
            .build()
        client.queryPurchasesAsync(params) { result, purchases ->
            if (result.responseCode != BillingClient.BillingResponseCode.OK) { onError("restore failed"); return@queryPurchasesAsync }
            val token = purchases.firstOrNull { this.sku in it.products && it.purchaseState == Purchase.PurchaseState.PURCHASED }?.purchaseToken
            onPurchase(token ?: "")   // empty → JS treats as nothing to restore
        }
    }

    /** Best-effort re-check on resume (out-of-app purchase, Play Pass, restore). */
    fun refreshPurchases() {
        if (connected) restore(sku)
    }

    fun dispose() { runCatching { client.endConnection() } }

    private fun onPurchase(token: String) =
        evaluateJs("window.__mcOnPurchase && window.__mcOnPurchase(${jsString(token)})")

    private fun onError(message: String) =
        evaluateJs("window.__mcOnPurchaseError && window.__mcOnPurchaseError(${jsString(message)})")

    private fun jsString(s: String): String =
        "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""
}

/**
 * Bridges the v7/v8 queryProductDetailsAsync result-type difference. Written as
 * a helper so the CI compile error (if any) is isolated to one place. Uses
 * reflection-free access via the two known shapes.
 */
private fun extractFirstProduct(result: Any?): ProductDetails? = when (result) {
    is List<*> -> result.filterIsInstance<ProductDetails>().firstOrNull()   // PBL 7
    else -> runCatching {
        // PBL 8: QueryProductDetailsResult#getProductDetailsList()
        val m = result?.javaClass?.getMethod("getProductDetailsList")
        @Suppress("UNCHECKED_CAST")
        (m?.invoke(result) as? List<ProductDetails>)?.firstOrNull()
    }.getOrNull()
}
