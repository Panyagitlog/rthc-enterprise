import { supabase } from "./supabase";

export const signIn = (email, password) => {
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
};

export const signOut = () => {
  return supabase.auth.signOut();
};

export const getUser = () => {
  return supabase.auth.getUser();
};

export const getSession = () => {
  return supabase.auth.getSession();
};

export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback);
};