import { db } from "../db";
import { MockEntityMaster, MockSecurityMaster } from "./mock";
import type { EntityMasterClient, SecurityMasterClient } from "./types";

/** The entity master borrowers are linked to. Swap for a real client here. */
export const entityMaster: EntityMasterClient = new MockEntityMaster(db);
/** The security master booked facilities are linked to. Swap for a real client here. */
export const securityMaster: SecurityMasterClient = new MockSecurityMaster(db);

export type * from "./types";
