import { Router, type IRouter } from "express";
import authRouter from "./auth";
import bookingsRouter from "./bookings";
import businessRouter from "./business";
import conversationsRouter from "./conversations";
import eventsRouter from "./events";
import healthRouter from "./health";
import reviewsRouter from "./reviews";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(eventsRouter);
router.use(reviewsRouter);
router.use(bookingsRouter);
router.use(conversationsRouter);
router.use(businessRouter);
router.use(usersRouter);

export default router;
