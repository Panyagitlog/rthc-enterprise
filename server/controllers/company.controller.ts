import { Request, Response } from "express";
import * as companyRepository from "../repositories/company.repository";

export async function getCompanies(_req: Request, res: Response) {
	res.json(await companyRepository.findAll());
}

export async function getCompany(req: Request, res: Response) {
	const company = await companyRepository.findById(String(req.params.id || ""));
	if (!company) return res.status(404).json({ message: "Company not found" });
	return res.json(company);
}

export async function createCompany(req: Request, res: Response) {
	res.status(201).json(await companyRepository.create(req.body));
}

export async function updateCompany(req: Request, res: Response) {
	res.json(await companyRepository.update(String(req.params.id || ""), req.body));
}

export async function deleteCompany(req: Request, res: Response) {
	await companyRepository.remove(String(req.params.id || ""));
	res.status(204).send();
}
