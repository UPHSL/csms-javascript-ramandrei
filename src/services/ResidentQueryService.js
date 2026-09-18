export default class ResidentQueryService {
  constructor(repository) {
    this.repository = repository;
  }

  listResidents() {
    return this.repository.findAll();
  }

  searchResidents(searchTerm) {
    const normalizedSearchTerm =
      String(searchTerm ?? "").trim();

    if (normalizedSearchTerm === "") {
      return this.listResidents();
    }

    return this.repository.searchByName(
      normalizedSearchTerm
    );
  }
}