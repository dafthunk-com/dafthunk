import { Hono } from "hono";

import { jwtMiddleware } from "../../auth";
import { ApiContext } from "../../context";
import { adminMiddleware } from "../../middleware/admin";
import adminDatabasesRoutes from "./databases";
import adminDatasetsRoutes from "./datasets";
import adminDeploymentsRoutes from "./deployments";
import adminEmailsRoutes from "./emails";
import adminExecutionsRoutes from "./executions";
import adminOrganizationsRoutes from "./organizations";
import adminQueuesRoutes from "./queues";
import adminStatsRoutes from "./stats";
import adminUsersRoutes from "./users";
import adminWorkflowsRoutes from "./workflows";

const adminRoutes = new Hono<ApiContext>();

// Apply authentication middleware to all admin routes
adminRoutes.use("*", jwtMiddleware);

// Apply admin role check to all admin routes
adminRoutes.use("*", adminMiddleware);

// Mount admin sub-routes
adminRoutes.route("/stats", adminStatsRoutes);
adminRoutes.route("/users", adminUsersRoutes);
adminRoutes.route("/organizations", adminOrganizationsRoutes);
adminRoutes.route("/workflows", adminWorkflowsRoutes);
adminRoutes.route("/deployments", adminDeploymentsRoutes);
adminRoutes.route("/executions", adminExecutionsRoutes);
adminRoutes.route("/emails", adminEmailsRoutes);
adminRoutes.route("/queues", adminQueuesRoutes);
adminRoutes.route("/datasets", adminDatasetsRoutes);
adminRoutes.route("/databases", adminDatabasesRoutes);

export default adminRoutes;
