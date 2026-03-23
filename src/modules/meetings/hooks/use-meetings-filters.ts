import { parseAsInteger, parseAsString, useQueryStates, parseAsStringEnum } from "nuqs";
import { MeetingStatus } from "../types";
import { DEFAULT_PAGE } from "@/constants";

export const useMeetingsFilters = () => {
  return useQueryStates({
    search: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
    page: parseAsInteger
      .withDefault(DEFAULT_PAGE)
      .withOptions({ clearOnDefault: true }),
    agentId: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
    status: parseAsStringEnum(Object.values(MeetingStatus)),
  });
};