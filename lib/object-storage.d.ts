import { v4 as uuidV4 } from "uuid";

declare namespace ObjectStorage {
  type ServerResponse = {
    status: "OK" | "FAILED";
    message: string;
  };

  abstract class ClientError implements Error {
    name: string;
    message: string;
    stack?: string | undefined;
    cause?: unknown;

    constructor(name: string, message: string);
  }

  class ObjectCreationError extends ClientError {}
  class ObjectUpdateError extends ClientError {}
  class ObjectDeletionError extends ClientError {}

  interface Client {
    /**
     * @throws {ObjectCreationError}
     */
    create(resource: Blob): ServerResponse;

    /**
     * @throws {ObjectUpdateError}
     */
    update(
      resourceId: string | number | ReturnType<typeof uuidV4>,
      resource: Blob,
    ): ServerResponse;

    /**
     * @throws {ObjectDeletionError}
     */
    delete(
      resourceId: string | number | ReturnType<typeof uuidV4>,
    ): ServerResponse;
  }
}

export default ObjectStorage;
