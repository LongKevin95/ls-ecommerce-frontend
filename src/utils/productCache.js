function getNormalizedProductId(product) {
  return String(product?.id ?? product?._id ?? "").trim();
}

function replaceProductInList(products, updatedProduct) {
  if (!Array.isArray(products)) {
    return products;
  }

  const updatedProductId = getNormalizedProductId(updatedProduct);

  if (!updatedProductId) {
    return products;
  }

  let hasMatch = false;
  const nextProducts = products.map((product) => {
    if (getNormalizedProductId(product) !== updatedProductId) {
      return product;
    }

    hasMatch = true;
    return {
      ...product,
      ...updatedProduct,
    };
  });

  return hasMatch ? nextProducts : products;
}

export function syncProductCaches(queryClient, updatedProduct) {
  const updatedProductId = getNormalizedProductId(updatedProduct);

  if (!queryClient || !updatedProductId) {
    return;
  }

  queryClient.setQueryData(["products", "detail", updatedProductId], updatedProduct);
  queryClient.setQueryData(["products", "public"], (current) =>
    replaceProductInList(current, updatedProduct),
  );
  queryClient.setQueryData(["products", "admin"], (current) =>
    replaceProductInList(current, updatedProduct),
  );
}
