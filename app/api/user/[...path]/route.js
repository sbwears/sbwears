// PhonePe payments API.
import { routeHandlers } from "@/lib/server/api-router";
import { paymentRouter } from "@/lib/server/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, PUT, PATCH, DELETE } = routeHandlers(paymentRouter);
