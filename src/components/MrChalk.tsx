/**
 * Backward-compat shim. The companion was rewritten as the generic `Teacher`
 * component in Teacher.tsx — this file re-exports it under the legacy
 * `MrChalk` name so existing imports still resolve.
 *
 * New code should import { Teacher } from './Teacher' and pass `teacherId`.
 */
export { Teacher as MrChalk } from './Teacher';
export type { TeacherProps } from './Teacher';
