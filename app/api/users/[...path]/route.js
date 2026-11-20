// Shopper + catalogue API (same routes as /api/admin).
import { routeHandlers } from "@/lib/server/api-router";
import { userRouter } from "@/lib/server/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, PUT, PATCH, DELETE } = routeHandlers(userRouter);
