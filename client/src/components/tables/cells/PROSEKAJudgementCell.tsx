import { IsNullish } from "util/misc";
import React from "react";
import { COLOUR_SET, PBScoreDocument, ScoreDocument } from "tachi-common";

export default function PROSEKAJudgementCell({
    score,
}: {
    score: ScoreDocument<"proseka:Single"> | PBScoreDocument<"proseka:Single">;
}) {
    const perfect = score.scoreData.perfectjudgements;
    const great = score.scoreData.greatjudgements;
    const good = score.scoreData.goodjudgements;
    const bad = score.scoreData.badjudgements;
    const miss = score.scoreData.missjudgements;

    if (
        IsNullish(miss) ||
        IsNullish(bad) ||
        IsNullish(good) ||
        IsNullish(great) ||
        IsNullish(perfect)
    ) {
        return <td>No Data.</td>;
    }

    return (
        <td>
            <strong>
                <span style={{ 
                    background: "linear-gradient(90deg, #ff0080, #ff8c00, #40e0d0, #9370db)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text"
                }}>
                    {perfect}
                </span>-
                <span style={{ color: COLOUR_SET.vibrantPink }}>{great}</span>-
                <span style={{ color: COLOUR_SET.teal }}>{good}</span>-
                <span style={{ color: COLOUR_SET.paleGreen }}>{bad}</span>-
                <span style={{ color: COLOUR_SET.red }}>{miss}</span>
            </strong>
        </td>
    );
}