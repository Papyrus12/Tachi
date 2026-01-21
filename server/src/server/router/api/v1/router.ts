console.log("Loading activityRouter");
import activityRouter from "./activity/router";
console.log("Loading adminRouter");
import adminRouter from "./admin/router";
console.log("Loading authRouter");
import authRouter from "./auth/router";
console.log("Loading clientsRouter");
import clientsRouter from "./clients/router";
console.log("Loading configRouter");
import configRouter from "./config/router";
console.log("Loading gamesRouter");
import gamesRouter from "./games/router";
console.log("Loading importRouter");
import importRouter from "./import/router";
console.log("Loading importsRouter");
import importsRouter from "./imports/router";
console.log("Loading oauthRouter");
import oauthRouter from "./oauth/router";
console.log("Loading scoresRouter");
import scoresRouter from "./scores/router";
console.log("Loading searchRouter");
import searchRouter from "./search/router";
console.log("Loading seedsRouter");
import seedsRouter from "./seeds/router";
console.log("Loading sessionsRouter");
import sessionsRouter from "./sessions/router";
console.log("Loading statusRouter");
import statusRouter from "./status/router";
console.log("Loading usersRouter");
import usersRouter from "./users/router";
console.log("ALL ROUTERS LOADED SUCCESSFULLY!");
import { Router } from "express";
import { NormalRateLimitMiddleware } from "server/middleware/rate-limiter";

const router: Router = Router({ mergeParams: true });

// Auth is up here so it can have special rate limiting rules,
// since it needs slightly harsher ones!
router.use("/auth", authRouter);

// Everything else can use the normal rate limiter!
router.use(NormalRateLimitMiddleware);

router.use("/admin", adminRouter);
router.use("/activity", activityRouter);
router.use("/status", statusRouter);
router.use("/import", importRouter);
router.use("/imports", importsRouter);
router.use("/users", usersRouter);
router.use("/games", gamesRouter);
router.use("/search", searchRouter);
router.use("/scores", scoresRouter);
router.use("/sessions", sessionsRouter);
router.use("/oauth", oauthRouter);
router.use("/clients", clientsRouter);
router.use("/config", configRouter);
router.use("/seeds", seedsRouter);

/**
 * Return a JSON 404 response if an endpoint is hit that does not exist.
 *
 * @name ALL /api/v1/*
 */
router.all("*", (req, res) =>
	res.status(404).json({
		success: false,
		description: "Endpoint Not Found.",
	})
);

export default router;
