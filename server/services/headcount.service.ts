import {
  updateHeadCount,
  getCurrentHeadCount,
} from "../repositories/headcount.repository";

interface SaveBody {
  locationId: string;
  requirement: number;
  filled: number;
  updatedBy: string;
}

export async function save(data: SaveBody) {
  const {
    locationId,
    requirement,
    filled,
    updatedBy,
  } = data;

  if (!locationId) {
    throw new Error("Location is required");
  }

  if (requirement < 0) {
    throw new Error("Requirement cannot be negative");
  }

  if (filled < 0) {
    throw new Error("Filled cannot be negative");
  }

  return updateHeadCount(
    locationId,
    Number(requirement),
    Number(filled),
    updatedBy
  );
}

export async function current() {
  return getCurrentHeadCount();
}