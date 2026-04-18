/**
 * REQ-02: NHTSA vPIC decode — auto-fill year / make / model from VIN.
 * Schedule intervals still use app defaults + advisor (REQ-07).
 */

export type VinDecodeResult = {
  year: string;
  make: string;
  model: string;
  error?: string;
};

function cleanVin(vin: string): string {
  return vin.trim().toUpperCase().replace(/\s/g, '');
}

export function validateVinFormat(vin: string): string | null {
  const v = cleanVin(vin);
  if (v.length !== 17) return 'VIN must be exactly 17 characters.';
  if (/[IOQ]/.test(v)) return 'VIN cannot contain I, O, or Q.';
  return null;
}

export async function decodeVinWithNhtsa(vin: string): Promise<VinDecodeResult> {
  const err = validateVinFormat(vin);
  if (err) return { year: '', make: '', model: '', error: err };

  const v = cleanVin(vin);
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(v)}?format=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { year: '', make: '', model: '', error: 'NHTSA lookup failed.' };
    }
    const data = (await res.json()) as {
      Results?: Array<Record<string, string>>;
    };
    const row = data.Results?.[0];
    if (!row) {
      return { year: '', make: '', model: '', error: 'No decode result.' };
    }

    const year = (row.ModelYear || '').trim();
    const make = (row.Make || '').trim();
    const model = (row.Model || '').trim();

    if (!year || year === '0' || !make) {
      return {
        year: '',
        make: '',
        model: '',
        error: 'Could not read year/make from this VIN.',
      };
    }

    return {
      year: String(year),
      make,
      model: model || make,
    };
  } catch {
    return { year: '', make: '', model: '', error: 'Network error during VIN lookup.' };
  }
}
