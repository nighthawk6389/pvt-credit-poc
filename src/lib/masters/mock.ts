import type { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

import type {
  BorrowerProfile,
  EntityMasterClient,
  InstrumentRecord,
  NewBorrower,
  NewInstrument,
  SecurityMasterClient,
} from "./types";

// Stand-ins for an entity master and a security master. Each keeps its records
// in its own table (MockEntityRecord, MockInstrument) and nothing else in the
// app touches those tables — everything goes through the client interfaces,
// as it would with a real external system. The Prisma client is injected so
// the seed and the app can share one implementation.

const newRef = (prefix: string) => `${prefix}-${randomBytes(4).toString("hex").toUpperCase()}`;

export class MockEntityMaster implements EntityMasterClient {
  constructor(private readonly db: PrismaClient) {}

  async getBorrowers(refs: string[]): Promise<Map<string, BorrowerProfile>> {
    if (refs.length === 0) return new Map();
    const rows = await this.db.mockEntityRecord.findMany({ where: { ref: { in: [...new Set(refs)] } } });
    return new Map(rows.map((r) => [r.ref, toProfile(r)]));
  }

  /** `ref` is accepted only so the seed is deterministic; a real master assigns it. */
  async createBorrower(input: NewBorrower, opts: { ref?: string } = {}): Promise<BorrowerProfile> {
    const row = await this.db.mockEntityRecord.create({ data: { ref: opts.ref ?? newRef("EM"), ...input } });
    return toProfile(row);
  }
}

export class MockSecurityMaster implements SecurityMasterClient {
  constructor(private readonly db: PrismaClient) {}

  async getInstruments(refs: string[]): Promise<Map<string, InstrumentRecord>> {
    if (refs.length === 0) return new Map();
    const rows = await this.db.mockInstrument.findMany({ where: { ref: { in: [...new Set(refs)] } } });
    return new Map(rows.map((r) => [r.ref, toInstrument(r)]));
  }

  /** `ref` is accepted only so the seed is deterministic; a real master assigns it. */
  async bookInstrument(input: NewInstrument, opts: { ref?: string } = {}): Promise<InstrumentRecord> {
    const row = await this.db.mockInstrument.create({ data: { ref: opts.ref ?? newRef("SM-LN"), ...input } });
    return toInstrument(row);
  }
}

type EntityRow = Awaited<ReturnType<PrismaClient["mockEntityRecord"]["create"]>>;
type InstrumentRow = Awaited<ReturnType<PrismaClient["mockInstrument"]["create"]>>;

function toProfile(r: EntityRow): BorrowerProfile {
  return {
    ref: r.ref,
    name: r.name,
    sector: r.sector,
    description: r.description,
    hqCity: r.hqCity,
    website: r.website,
    ceo: r.ceo,
    founded: r.founded,
  };
}

function toInstrument(r: InstrumentRow): InstrumentRecord {
  return {
    ref: r.ref,
    name: r.name,
    currency: r.currency,
    type: r.type,
    seniority: r.seniority,
    commitment: r.commitment,
    funded: r.funded,
    spreadBps: r.spreadBps,
    floorBps: r.floorBps,
    oidPct: r.oidPct,
    pikBps: r.pikBps,
    upfrontFeeBps: r.upfrontFeeBps,
    maturity: r.maturity,
  };
}
