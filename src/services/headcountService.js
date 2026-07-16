// src/services/headcountService.js

import { supabase } from "./supabase";

export const fetchCompanies = async () => {
  const { data, error } = await supabase
    .from("companies")
    .select("id, company_name")
    .order("company_name");

  if (error) {
    console.error("Fetch Companies Error:", error);
    throw error;
  }

  return data;
};

export const fetchLocationsByCompany = async (companyId) => {
  const { data, error } = await supabase
    .from("locations")
    .select("id, location_name")
    .eq("company_id", companyId)
    .order("location_name");

  if (error) {
    console.error("Fetch Locations Error:", error);
    throw error;
  }

  return data;
};

export const createHeadcountUpdate = async (payload) => {
  console.log("========== PAYLOAD ==========");
  console.log(payload);

  const { data, error } = await supabase
    .from("headcount_updates")
    .insert(payload)
    .select();

  if (error) {
    console.error("========== SUPABASE ERROR ==========");
    console.error(error);
    throw error;
  }

  console.log("========== INSERT SUCCESS ==========");
  console.log(data);

  return data;
};