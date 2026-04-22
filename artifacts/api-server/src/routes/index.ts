import { Router, type IRouter } from "express";
import healthRouter from "./health";
import lookupRouter from "./lookup";

const router: IRouter = Router();

router.use(healthRouter);
router.use(lookupRouter);

export default router;
