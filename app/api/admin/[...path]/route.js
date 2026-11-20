// Same router as /api/users; the old Express app mounted it on both prefixes.
import { routeHandlers } from "@/lib/server/api-router";
import { userRouter } from "@/lib/server/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, PUT, PATCH, DELETE } = routeHandlers(userRouter);
