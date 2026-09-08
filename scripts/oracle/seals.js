#!/usr/bin/env node
// seals.js — thin wrapper/aggregator over the oracle SSOT trio (P1后半).
// NOT a fork: canonical JSON + hashing live ONLY in record.js.
// This file re-exports canonicalize and aggregates trio metadata.
// No new grading logic, no execution of artifacts, no daemon, no repo writes.
//
// SSOT: scripts/oracle/record.js (canonicalize), seal.js (sidecar), grade.js (PASS/FAIL/TAMPERED).
import { canonicalize } from "./record.js";

export { canonicalize };

export const TRIO = ["record.js", "seal.js", "grade.js"];

export const VERDICTS = ["PASS", "FAIL", "TAMPERED"];

export const BUS_DIR_TEMPLATE = "/tmp/verdict-bus-<ts>/";