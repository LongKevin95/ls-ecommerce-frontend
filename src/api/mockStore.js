import { mockOrders, mockProducts, mockUsers } from "../mocks/mockData";
import { readStorageJson, writeStorageJson } from "../utils/storage";

const STORAGE_KEYS = {
  USERS: "ls-clean-fe-mock-users",
  PRODUCTS: "ls-clean-fe-mock-products",
  ORDERS: "ls-clean-fe-mock-orders",
};

function ensureCollection(key, seedData) {
  const currentValue = readStorageJson(key, null);

  if (Array.isArray(currentValue)) {
    return currentValue;
  }

  writeStorageJson(key, seedData);
  return seedData;
}

export function getUsersCollection() {
  return ensureCollection(STORAGE_KEYS.USERS, mockUsers);
}

export function saveUsersCollection(nextUsers) {
  writeStorageJson(STORAGE_KEYS.USERS, nextUsers);
}

export function getProductsCollection() {
  return ensureCollection(STORAGE_KEYS.PRODUCTS, mockProducts);
}

export function saveProductsCollection(nextProducts) {
  writeStorageJson(STORAGE_KEYS.PRODUCTS, nextProducts);
}

export function getOrdersCollection() {
  return ensureCollection(STORAGE_KEYS.ORDERS, mockOrders);
}

export function saveOrdersCollection(nextOrders) {
  writeStorageJson(STORAGE_KEYS.ORDERS, nextOrders);
}
