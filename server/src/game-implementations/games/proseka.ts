import { GoalFmtPercent, GoalOutOfFmtPercent } from "./_common";
import { CreatePBMergeFor } from "game-implementations/utils/pb-merge";
import { ProfileAvgBestN } from "game-implementations/utils/profile-calc";
import { SessionAvgBest10For } from "game-implementations/utils/session-calc";
import { PROSEKARating } from "rg-stats";

import { IsNullish } from "utils/misc";
import type { GPTServerImplementation } from "game-implementations/types";

export const PROSEKA_IMPL: GPTServerImplementation<"proseka:Single"> = {
	chartSpecificValidators: {},
	derivers: {
		percent: ({
			perfectjudgements,
			greatjudgements,
			goodjudgements,
			badjudgements,
			missjudgements,
		}) => {
			const totalJudgements =
				perfectjudgements +
				greatjudgements +
				goodjudgements +
				badjudgements +
				missjudgements;
			if (totalJudgements === 0) return 0;
			return (
				((perfectjudgements * 3 +
					greatjudgements * 2 +
					goodjudgements * 1 +
					badjudgements * 0 +
					missjudgements * 0) /
					(totalJudgements * 3)) * // FIXED: Added parentheses
				100
			);
		},
	},
	scoreCalcs: {
		rating: (scoreData, chart) =>
			PROSEKARating.calculate(
				scoreData.perfectjudgements,
				scoreData.greatjudgements,
				scoreData.goodjudgements,
				scoreData.badjudgements,
				scoreData.missjudgements,
				chart.levelNum,
				scoreData.perfectjudgements +
					scoreData.greatjudgements +
					scoreData.goodjudgements +
					scoreData.badjudgements +
					scoreData.missjudgements
			),
	},
	sessionCalcs: { naiveRating: SessionAvgBest10For("rating") },
	profileCalcs: { naiveRating: ProfileAvgBestN("rating", 30, false, 100) },
	classDerivers: {
		colour: (ratings) => {
			const rating = ratings.naiveRating;
			if (IsNullish(rating)) {
				return null;
			}
			if (rating >= 40) {
				return "RAINBOW";
			} else if (rating >= 39) {
				return "WHITE";
			} else if (rating >= 38) {
				return "GRAY";
			} else if (rating >= 36) {
				return "BLACK";
			} else if (rating >= 34) {
				return "PLATINUM";
			} else if (rating >= 32) {
				return "GOLD";
			} else if (rating >= 29) {
				return "SILVER";
			} else if (rating >= 25) {
				return "COPPER";
			} else if (rating >= 20) {
				return "ORANGE";
			} else if (rating >= 15) {
				return "YELLOW";
			} else if (rating >= 10) {
				return "RED";
			}
			return "BLUE";
		},
	},
	goalCriteriaFormatters: {
		percent: GoalFmtPercent,
		perfectjudgements: (val: number) => val.toString(),
		greatjudgements: (val: number) => val.toString(),
		goodjudgements: (val: number) => val.toString(),
		badjudgements: (val: number) => val.toString(),
		missjudgements: (val: number) => val.toString(),
	},
	goalProgressFormatters: {
		noteLamp: (pb) => pb.scoreData.noteLamp,
		percent: (pb) => GoalFmtPercent(pb.scoreData.percent),
		perfectjudgements: (pb) => pb.scoreData.perfectjudgements.toString(),
		greatjudgements: (pb) => pb.scoreData.greatjudgements.toString(),
		goodjudgements: (pb) => pb.scoreData.goodjudgements.toString(),
		badjudgements: (pb) => pb.scoreData.badjudgements.toString(),
		missjudgements: (pb) => pb.scoreData.missjudgements.toString(),
	},
	goalOutOfFormatters: {
		percent: GoalOutOfFmtPercent,
		perfectjudgements: (val: number) => val.toString(),
		greatjudgements: (val: number) => val.toString(),
		goodjudgements: (val: number) => val.toString(),
		badjudgements: (val: number) => val.toString(),
		missjudgements: (val: number) => val.toString(),
	},
	pbMergeFunctions: [
		CreatePBMergeFor("largest", "percent", "Best Score", (base, score) => {
			base.scoreData.percent = score.scoreData.percent;
			base.scoreData.perfectjudgements = score.scoreData.perfectjudgements;
			base.scoreData.greatjudgements = score.scoreData.greatjudgements;
			base.scoreData.goodjudgements = score.scoreData.goodjudgements;
			base.scoreData.badjudgements = score.scoreData.badjudgements;
			base.scoreData.missjudgements = score.scoreData.missjudgements;
			// Copy any other relevant scoreData fields
		}),
		CreatePBMergeFor("largest", "enumIndexes.noteLamp", "Best Note Lamp", (base, score) => {
			base.scoreData.noteLamp = score.scoreData.noteLamp;
		}),
	],
	defaultMergeRefName: "Best Score",
	scoreValidators: [
		(s) => {
			// FIXED: Grouped the lamp check properly
			if (s.scoreData.noteLamp === "ALL PERFECT" && s.scoreData.percent !== 100) {
				return "An AP must have a percent of 100.";
			}

			if (s.scoreData.noteLamp !== "ALL PERFECT" && s.scoreData.percent === 100) {
				return "A percent of 100 must have a lamp of ALL PERFECT.";
			}

			// FIXED: Now only checks if lamp is FULL COMBO
			if (
				s.scoreData.noteLamp === "FULL COMBO" &&
				(s.scoreData.missjudgements > 0 || s.scoreData.badjudgements > 0)
			) {
				return `A score with ${s.scoreData.missjudgements} misses or ${s.scoreData.badjudgements} bad judgements cannot be a FULL COMBO.`;
			}
		},
		(s) => {
			// FIXED: This validator was accessing s.scoreData.judgements which doesn't exist
			// The judgements are directly on scoreData
			const great = s.scoreData.greatjudgements ?? 0;
			const good = s.scoreData.goodjudgements ?? 0;
			const bad = s.scoreData.badjudgements ?? 0;
			const miss = s.scoreData.missjudgements ?? 0;

			if (s.scoreData.noteLamp === "ALL PERFECT") {
				if (great + good + bad + miss > 0) {
					return "Cannot have an ALL PERFECT with any non-perfect judgements.";
				}
			}

			if (s.scoreData.noteLamp === "FULL COMBO") {
				if (miss > 0 || bad > 0) {
					// FIXED: Also check bads for FC
					return "Cannot have a FULL COMBO if the score has misses or bad judgements.";
				}
			}
		},
		(s) => {
			// FIXED: maxCombo is in scoreData.optional, and judgements are on scoreData directly
			const maxCombo = s.scoreData.optional?.maxCombo;
			const perfect = s.scoreData.perfectjudgements;
			const great = s.scoreData.greatjudgements;
			const good = s.scoreData.goodjudgements;
			const bad = s.scoreData.badjudgements;
			const miss = s.scoreData.missjudgements;

			if (
				IsNullish(maxCombo) ||
				IsNullish(perfect) ||
				IsNullish(great) ||
				IsNullish(good) ||
				IsNullish(bad) ||
				IsNullish(miss)
			) {
				return;
			}

			if (
				s.scoreData.noteLamp !== "NONE" &&
				perfect + great + good + bad + miss !== maxCombo
			) {
				const article = s.scoreData.noteLamp === "FULL COMBO" ? "a" : "an";

				return `Cannot have ${article} ${s.scoreData.noteLamp} if maxCombo is not equal to the sum of judgements.`;
			}
		},
	],
};
