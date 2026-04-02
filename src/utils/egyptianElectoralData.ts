import egyptGeoComplete from "@/data/egypt-geo-complete.json";

export type GovernorateKey = keyof typeof egyptGeoComplete;

export interface LabeledOption {
  value: string;
  label: string;
}

export interface ElectoralDistrictOption extends LabeledOption {
  seats?: number;
  covers?: string[];
}

type GovernorateData = (typeof egyptGeoComplete)[GovernorateKey];

const findGovernorate = (governorate: string): GovernorateData | null => {
  return (egyptGeoComplete as Record<string, GovernorateData>)[governorate] ?? null;
};

const resolveDistrict = (governorate: string, district?: string) => {
  const gov = findGovernorate(governorate);
  if (!gov || !district) return null;
  return gov.districts.find(
    (d) => d.en.toLowerCase() === district.toLowerCase() || d.ar === district,
  );
};

export const getGovernorateOptions = (): LabeledOption[] =>
  Object.entries(egyptGeoComplete).map(([key, value]) => ({
    value: key,
    label: `${key} / ${value.name_ar}`,
  }));

export const getDistrictOptions = (governorate?: string): LabeledOption[] => {
  const gov = governorate ? findGovernorate(governorate) : null;
  if (!gov) return [];
  return gov.districts.map((d) => ({
    value: d.en,
    label: `${d.en} / ${d.ar}`,
  }));
};

export const getElectoralDistrictOptions = (
  governorate?: string,
  district?: string,
): ElectoralDistrictOption[] => {
  const gov = governorate ? findGovernorate(governorate) : null;
  if (!gov) return [];

  const options = gov.electoral_districts.map((e) => ({
    value: e.en,
    label: `${e.en} / ${e.ar}`,
    seats: e.seats,
    covers: e.covers,
  }));

  if (!district) return options;

  const matchedDistrict = resolveDistrict(governorate, district);
  if (!matchedDistrict) return options;

  return options.filter((opt) => {
    if (!opt.covers || opt.covers.length === 0) return true;
    return opt.covers.some(
      (cover) =>
        cover.toLowerCase() === matchedDistrict.en.toLowerCase() ||
        cover === matchedDistrict.ar,
    );
  });
};

export const isValidGovernorate = (governorate: string): boolean =>
  Boolean(findGovernorate(governorate));

export const isValidDistrictForGovernorate = (governorate: string, district?: string): boolean => {
  if (!district) return false;
  return Boolean(resolveDistrict(governorate, district));
};

export const isValidElectoralDistrictForGovernorate = (
  governorate: string,
  electoralDistrict?: string,
  district?: string,
): boolean => {
  if (!electoralDistrict) return false;
  const gov = findGovernorate(governorate);
  if (!gov) return false;

  const match = gov.electoral_districts.find(
    (e) => e.en.toLowerCase() === electoralDistrict.toLowerCase() || e.ar === electoralDistrict,
  );
  if (!match) return false;

  if (!district || !match.covers || match.covers.length === 0) return true;

  const resolvedDistrict = resolveDistrict(governorate, district);
  if (!resolvedDistrict) return false;

  return match.covers.some(
    (cover) =>
      cover.toLowerCase() === resolvedDistrict.en.toLowerCase() || cover === resolvedDistrict.ar,
  );
};
