// tests/e2e/helpers/personas.ts
// Parses playwright.personas.yaml and exports typed persona objects for use in e2e tests.
// Schema: https://github.com/Open-Paws/open-paws-strategy/ecosystem/playwright-persona-schema.md

import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { join } from 'path';

export interface PersonaFlow {
  id: string;
  name: string;
  entry_point: string;
  steps: string[];
  expected_outcome: string;
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  description: string;
  auth: {
    state: 'enrolled' | 'anonymous' | 'pending' | 'rejected' | 'suspended' | 'admin';
    seed_account?: string;
  };
  accessibility?: { needs: string[] };
  device?: {
    type?: string;
    viewport?: { width: number; height: number };
    dark_mode?: boolean;
  };
  content_sensitivity?: { tier: 'minimal' | 'standard' | 'detailed' };
  flows: PersonaFlow[];
  assertions: {
    should_see: string[];
    should_not_see: string[];
    critical_routes?: { accessible?: string[]; blocked?: string[] };
  };
}

export interface PersonaFile {
  version: string;
  personas: Persona[];
}

const raw = readFileSync(join(process.cwd(), 'playwright.personas.yaml'), 'utf-8');
export const personaConfig: PersonaFile = parse(raw);

export function getPersona(id: string): Persona {
  const found = personaConfig.personas.find((p) => p.id === id);
  if (!found) throw new Error(`Persona '${id}' not found in playwright.personas.yaml`);
  return found;
}

export const personas = Object.fromEntries(
  personaConfig.personas.map((p) => [p.id, p])
) as Record<string, Persona>;
