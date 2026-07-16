import * as repository from "../repositories/company.repository";

export const createCompany = async (data: any) => {
  return repository.create(data);
};

export const getCompanies = async () => {
  return repository.findAll();
};

export const getCompany = async (id: string) => {
  return repository.findById(id);
};

export const updateCompany = async (
  id: string,
  data: any
) => {
  return repository.update(id, data);
};

export const deleteCompany = async (id: string) => {
  return repository.remove(id);
};