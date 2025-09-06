import Elysia from "elysia";

export const errorHandler = () =>
  new Elysia().onError(({ code, set, error }) => {
    if (code === "VALIDATION") {
      set.headers["content-type"] = "application/json";
      const errorObject = JSON.parse(error.message);

      const errorObjectSummaries: Record<string, string> =
        errorObject.errors.reduce(
          (
            acc: Record<string, string>,
            curr: { summary: string; path: string },
          ) => {
            acc[curr.path.slice(1)] = curr.summary;
            return acc;
          },
          {},
        );

      return {
        message: "a validation error occurred",
        errors: errorObjectSummaries,
      };
    }
  });
