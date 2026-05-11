/**
 * Teacher catalog. The order here is the display order in the picker.
 * Mr. Chalk is the only `isDefault: true` and is the new-user fallback.
 */

import type { Teacher } from './types';
import { MR_CHALK } from './chalk';
import { MS_SIGMA } from './sigma';
import { COACH_PI } from './coachPi';
import { PIXEL } from './pixel';
import { DR_CIPHER } from './cipher';
import { NANA } from './nana';
import { BOSS_ROBO } from './roboBoss';
import { LEX } from './lex';

export type { Teacher, PortraitProps } from './types';

export const TEACHERS: ReadonlyArray<Teacher> = [
    MR_CHALK,
    MS_SIGMA,
    COACH_PI,
    PIXEL,
    DR_CIPHER,
    NANA,
    BOSS_ROBO,
    LEX,
] as const;

export const DEFAULT_TEACHER_ID = MR_CHALK.id;

const TEACHER_MAP = new Map(TEACHERS.map(t => [t.id, t]));

export function getTeacher(id: string | null | undefined): Teacher {
    if (!id) return MR_CHALK;
    return TEACHER_MAP.get(id) ?? MR_CHALK;
}

/** Resolve which teacher to render given the player's saved choice and the
 *  current play context. Context auto-swap takes precedence so the right voice
 *  shows up at the right moment, but only among teachers the user has unlocked. */
export interface TeacherContext {
    isHardMode: boolean;
    isTimedMode: boolean;
    isSpeedrun: boolean;
    isMagicLesson: boolean;
    isStruggling: boolean;
    unlocked: Set<string>;
}

export function resolveActiveTeacher(savedId: string | null, ctx: TeacherContext): Teacher {
    // Pick the highest-priority context match among unlocked teachers
    const ordered: Array<keyof TeacherContext> = [
        'isStruggling',  // highest — emotional support beats everything
        'isMagicLesson',
        'isSpeedrun',
        'isTimedMode',
        'isHardMode',
    ];
    const conditionToContextFlag: Record<keyof Required<Teacher>['context'] & string, keyof TeacherContext> = {
        whenStruggling: 'isStruggling',
        whenMagicLesson: 'isMagicLesson',
        whenSpeedrun: 'isSpeedrun',
        whenTimedMode: 'isTimedMode',
        whenHardMode: 'isHardMode',
    };
    for (const flag of ordered) {
        if (!ctx[flag]) continue;
        const match = TEACHERS.find(t => {
            if (!t.context || !ctx.unlocked.has(t.id)) return false;
            return Object.entries(t.context).some(([k, v]) =>
                v === true && conditionToContextFlag[k as keyof typeof conditionToContextFlag] === flag);
        });
        if (match) return match;
    }
    // Fall back to the saved choice (if unlocked) or default
    const saved = savedId && ctx.unlocked.has(savedId) ? TEACHER_MAP.get(savedId) : undefined;
    return saved ?? MR_CHALK;
}
