export class InMemoryTodosCollection {
  #docs = new Map();
  #sequence = 0;

  find() {
    return {
      sort: () => ({
        toArray: async () =>
          [...this.#docs.values()].sort((a, b) =>
            String(a._id).localeCompare(String(b._id)),
          ),
      }),
    };
  }

  async insertOne(doc) {
    const insertedId = this.#nextObjectId();
    this.#docs.set(insertedId, { _id: insertedId, ...doc });
    return { insertedId };
  }

  async updateOne(filter, update) {
    const id = String(filter._id);
    const existing = this.#docs.get(id);
    if (!existing) {
      return { matchedCount: 0 };
    }

    this.#docs.set(id, { ...existing, ...update.$set });
    return { matchedCount: 1 };
  }

  async findOne(filter) {
    return this.#docs.get(String(filter._id)) ?? null;
  }

  async deleteOne(filter) {
    const deleted = this.#docs.delete(String(filter._id));
    return { deletedCount: deleted ? 1 : 0 };
  }

  #nextObjectId() {
    this.#sequence += 1;
    return this.#sequence.toString(16).padStart(24, "0");
  }
}
