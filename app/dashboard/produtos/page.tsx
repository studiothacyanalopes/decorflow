"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Box,
  CheckCircle2,
  ChevronDown,
  FolderTree,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Category = {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active?: boolean;
};

type Subcategory = {
  id: string;
  company_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  sort_order: number;
  is_active?: boolean;
};

type Product = {
  id: string;
  company_id: string;
  category_id: string | null;
  subcategory_ids: string[];
  product_type: "kit" | "loose";
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  gallery_urls: string[] | null;
  is_featured: boolean;
  is_active?: boolean;
  sort_order?: number | null;
  created_at?: string | null;
};

type CompanyContext = {
  id: string;
  name: string;
};

type StatusState = {
  type: "success" | "error" | "";
  message: string;
};

const initialCategoryForm = {
  id: "",
  name: "",
  slug: "",
  sort_order: 0,
  is_active: true,
};

const initialSubcategoryForm = {
  id: "",
  category_id: "",
  name: "",
  slug: "",
  sort_order: 0,
  is_active: true,
};

const initialProductForm = {
  id: "",
  category_id: "",
  subcategory_ids: [] as string[],
  product_type: "kit" as "kit" | "loose",
  name: "",
  slug: "",
  description: "",
  price: "",
  image_url: "",
  gallery_urls: [] as string[],
  is_featured: false,
  is_active: true,
  sort_order: 0,
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function formatPrice(value: number | string | null | undefined) {
  const numberValue = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numberValue);
}

function productMainImage(product: {
  image_url?: string | null;
  gallery_urls?: string[] | null;
}) {
  if (product.image_url) return product.image_url;
  if (Array.isArray(product.gallery_urls) && product.gallery_urls.length > 0) {
    return product.gallery_urls[0];
  }
  return "";
}



export default function ProdutosPage() {
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingSubcategory, setSavingSubcategory] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [company, setCompany] = useState<CompanyContext | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [status, setStatus] = useState<StatusState>({
    type: "",
    message: "",
  });

  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  const [categoryForm, setCategoryForm] = useState(initialCategoryForm);
  const [subcategoryForm, setSubcategoryForm] = useState(initialSubcategoryForm);
  const [productForm, setProductForm] = useState(initialProductForm);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [subcategoryModalOpen, setSubcategoryModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      setStatus({ type: "", message: "" });

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setStatus({
          type: "error",
          message: "Não foi possível identificar o usuário logado.",
        });
        return;
      }

      const { data: membership, error: membershipError } = await supabase
        .from("company_users")
        .select("company_id, companies:company_id(id, name)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (membershipError || !membership?.company_id) {
        setStatus({
          type: "error",
          message: "Nenhuma empresa encontrada para este usuário.",
        });
        return;
      }

      const companyData = Array.isArray(membership.companies)
        ? membership.companies[0]
        : membership.companies;

      setCompany({
        id: membership.company_id,
        name: companyData?.name ?? "Minha empresa",
      });

      const [categoriesRes, subcategoriesRes, productsRes] = await Promise.all([
        supabase
          .from("decor_categories")
          .select("id, company_id, name, slug, sort_order, is_active")
          .eq("company_id", membership.company_id)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),

        supabase
          .from("decor_subcategories")
          .select("id, company_id, category_id, name, slug, sort_order, is_active")
          .eq("company_id", membership.company_id)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),

supabase
  .from("decor_products")
  .select(`
    id,
    company_id,
    category_id,
    subcategory_ids,
    product_type,
    name,
    slug,
    description,
    price,
    image_url,
    gallery_urls,
    is_featured,
    is_active,
    sort_order,
    created_at
  `)
  .eq("company_id", membership.company_id)
  .order("is_featured", { ascending: false })
  .order("sort_order", { ascending: true })
  .order("created_at", { ascending: false }),
      ]);

      setCategories(categoriesRes.data || []);
      setSubcategories(subcategoriesRes.data || []);
      setProducts(productsRes.data || []);
    } catch {
      setStatus({
        type: "error",
        message: "Ocorreu um erro inesperado ao carregar os produtos.",
      });
    } finally {
      setLoading(false);
    }
  }

  function resetCategoryForm() {
    setCategoryForm(initialCategoryForm);
  }

  function resetSubcategoryForm(defaultCategoryId?: string) {
    setSubcategoryForm({
      ...initialSubcategoryForm,
      category_id: defaultCategoryId || "",
    });
  }

  function resetProductForm(defaultCategoryId?: string) {
    setProductForm({
      ...initialProductForm,
      category_id: defaultCategoryId || "",
    });
  }

  function openNewCategoryModal() {
    resetCategoryForm();
    setCategoryModalOpen(true);
  }

  function openEditCategoryModal(category: Category) {
    setCategoryForm({
      id: category.id,
      name: category.name || "",
      slug: category.slug || "",
      sort_order: Number(category.sort_order || 0),
      is_active: category.is_active ?? true,
    });
    setCategoryModalOpen(true);
  }

  function openNewSubcategoryModal(categoryId?: string) {
    resetSubcategoryForm(categoryId);
    setSubcategoryModalOpen(true);
  }

  function openEditSubcategoryModal(subcategory: Subcategory) {
    setSubcategoryForm({
      id: subcategory.id,
      category_id: subcategory.category_id || "",
      name: subcategory.name || "",
      slug: subcategory.slug || "",
      sort_order: Number(subcategory.sort_order || 0),
      is_active: subcategory.is_active ?? true,
    });
    setSubcategoryModalOpen(true);
  }

function openNewProductModal(
  categoryId?: string,
  preset: "kit" | "loose" = "kit"
) {
  setProductForm({
    ...initialProductForm,
    category_id: categoryId || "",
    product_type: preset,
    description:
      preset === "loose"
        ? "Item avulso para complementar kit."
        : "",
  });

  setProductModalOpen(true);
}



function openEditProductModal(product: Product) {
  setProductForm({
    id: product.id,
    category_id: product.category_id || "",
    subcategory_ids: Array.isArray(product.subcategory_ids)
      ? product.subcategory_ids
      : [],
    product_type: product.product_type === "loose" ? "loose" : "kit",
    name: product.name || "",
    slug: product.slug || "",
    description: product.description || "",
    price: product.price != null ? String(product.price) : "",
    image_url: product.image_url || "",
    gallery_urls: Array.isArray(product.gallery_urls) ? product.gallery_urls : [],
    is_featured: product.is_featured ?? false,
    is_active: product.is_active ?? true,
    sort_order: Number(product.sort_order || 0),
  });
  setProductModalOpen(true);
}

  async function ensureUniqueSlug(
    table: "decor_categories" | "decor_subcategories" | "decor_products",
    slug: string,
    currentId?: string
  ) {
    if (!company?.id) return true;

    let query = supabase
      .from(table)
      .select("id")
      .eq("company_id", company.id)
      .eq("slug", slug);

    if (currentId) {
      query = query.neq("id", currentId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) return false;
    return !data;
  }

  async function handleSaveCategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!company?.id) return;

    if (!categoryForm.name.trim()) {
      setStatus({
        type: "error",
        message: "Informe o nome da categoria.",
      });
      return;
    }

    const cleanSlug = slugify(categoryForm.slug || categoryForm.name);

    try {
      setSavingCategory(true);
      setStatus({ type: "", message: "" });

      const isUnique = await ensureUniqueSlug(
        "decor_categories",
        cleanSlug,
        categoryForm.id || undefined
      );

      if (!isUnique) {
        setStatus({
          type: "error",
          message: "Já existe uma categoria com esse slug.",
        });
        return;
      }

      const payload = {
        company_id: company.id,
        name: categoryForm.name.trim(),
        slug: cleanSlug,
        sort_order: Number(categoryForm.sort_order || 0),
        is_active: categoryForm.is_active,
      };

      if (categoryForm.id) {
        const { error } = await supabase
          .from("decor_categories")
          .update(payload)
          .eq("id", categoryForm.id)
          .eq("company_id", company.id);

        if (error) {
          setStatus({
            type: "error",
            message: "Não foi possível atualizar a categoria.",
          });
          return;
        }

        setStatus({
          type: "success",
          message: "Categoria atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase.from("decor_categories").insert(payload);

        if (error) {
          setStatus({
            type: "error",
            message: "Não foi possível cadastrar a categoria.",
          });
          return;
        }

        setStatus({
          type: "success",
          message: "Categoria cadastrada com sucesso.",
        });
      }

      setCategoryModalOpen(false);
      resetCategoryForm();
      await loadAll();
    } catch {
      setStatus({
        type: "error",
        message: "Ocorreu um erro inesperado ao salvar a categoria.",
      });
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleSaveSubcategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!company?.id) return;



    if (!subcategoryForm.name.trim()) {
      setStatus({
        type: "error",
        message: "Informe o nome da subcategoria.",
      });
      return;
    }

    const cleanSlug = slugify(subcategoryForm.slug || subcategoryForm.name);

    try {
      setSavingSubcategory(true);
      setStatus({ type: "", message: "" });

      const isUnique = await ensureUniqueSlug(
        "decor_subcategories",
        cleanSlug,
        subcategoryForm.id || undefined
      );

      if (!isUnique) {
        setStatus({
          type: "error",
          message: "Já existe uma subcategoria com esse slug.",
        });
        return;
      }

      const payload = {
        company_id: company.id,
        category_id: subcategoryForm.category_id || null,
        name: subcategoryForm.name.trim(),
        slug: cleanSlug,
        sort_order: Number(subcategoryForm.sort_order || 0),
        is_active: subcategoryForm.is_active,
      };

      if (subcategoryForm.id) {
        const { error } = await supabase
          .from("decor_subcategories")
          .update(payload)
          .eq("id", subcategoryForm.id)
          .eq("company_id", company.id);

        if (error) {
          setStatus({
            type: "error",
            message: "Não foi possível atualizar a subcategoria.",
          });
          return;
        }

        setStatus({
          type: "success",
          message: "Subcategoria atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from("decor_subcategories")
          .insert(payload);

        if (error) {
          setStatus({
            type: "error",
            message: "Não foi possível cadastrar a subcategoria.",
          });
          return;
        }

        setStatus({
          type: "success",
          message: "Subcategoria cadastrada com sucesso.",
        });
      }

      setSubcategoryModalOpen(false);
      resetSubcategoryForm();
      await loadAll();
    } catch {
      setStatus({
        type: "error",
        message: "Ocorreu um erro inesperado ao salvar a subcategoria.",
      });
    } finally {
      setSavingSubcategory(false);
    }
  }

  async function handleSaveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!company?.id) return;

    if (!productForm.name.trim()) {
      setStatus({
        type: "error",
        message: "Informe o nome do produto.",
      });
      return;
    }

    const cleanSlug = slugify(productForm.slug || productForm.name);

    try {
      setSavingProduct(true);
      setStatus({ type: "", message: "" });

      const isUnique = await ensureUniqueSlug(
        "decor_products",
        cleanSlug,
        productForm.id || undefined
      );

      if (!isUnique) {
        setStatus({
          type: "error",
          message: "Já existe um produto com esse slug.",
        });
        return;
      }

const payload = {
  company_id: company.id,
  category_id: productForm.category_id || null,
  subcategory_ids:
    productForm.subcategory_ids.length > 0 ? productForm.subcategory_ids : [],
  product_type: productForm.product_type,
  name: productForm.name.trim(),
  slug: cleanSlug,
  description: productForm.description.trim() || null,
  price: productForm.price ? Number(productForm.price) : null,
  image_url: productForm.image_url.trim() || null,
  gallery_urls: productForm.gallery_urls.length > 0 ? productForm.gallery_urls : [],
  is_featured: productForm.is_featured,
  is_active: productForm.is_active,
  sort_order: Number(productForm.sort_order || 0),
};

      if (productForm.id) {
        const { error } = await supabase
          .from("decor_products")
          .update(payload)
          .eq("id", productForm.id)
          .eq("company_id", company.id);

        if (error) {
          setStatus({
            type: "error",
            message: "Não foi possível atualizar o produto.",
          });
          return;
        }

        setStatus({
          type: "success",
          message: "Produto atualizado com sucesso.",
        });
      } else {
        const { error } = await supabase.from("decor_products").insert(payload);

        if (error) {
          setStatus({
            type: "error",
            message: "Não foi possível cadastrar o produto.",
          });
          return;
        }

        setStatus({
          type: "success",
          message: "Produto cadastrado com sucesso.",
        });
      }

      setProductModalOpen(false);
      resetProductForm();
      await loadAll();
    } catch {
      setStatus({
        type: "error",
        message: "Ocorreu um erro inesperado ao salvar o produto.",
      });
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleDeleteCategory(category: Category) {
    if (!company?.id) return;

    const hasProducts = products.some((item) => item.category_id === category.id);
    const hasSubcategories = subcategories.some(
      (item) => item.category_id === category.id
    );

    if (hasProducts || hasSubcategories) {
      setStatus({
        type: "error",
        message:
          "Essa categoria ainda possui subcategorias ou produtos vinculados. Remova primeiro os itens relacionados.",
      });
      return;
    }

    const confirmed = window.confirm(
      `Deseja realmente excluir a categoria "${category.name}"?`
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("decor_categories")
      .delete()
      .eq("id", category.id)
      .eq("company_id", company.id);

    if (error) {
      setStatus({
        type: "error",
        message: "Não foi possível excluir a categoria.",
      });
      return;
    }

    setStatus({
      type: "success",
      message: "Categoria excluída com sucesso.",
    });
    await loadAll();
  }

  async function handleDeleteSubcategory(subcategory: Subcategory) {
    if (!company?.id) return;

const hasProducts = products.some((item) =>
  Array.isArray(item.subcategory_ids) &&
  item.subcategory_ids.includes(subcategory.id)
);

    if (hasProducts) {
      setStatus({
        type: "error",
        message:
          "Essa subcategoria ainda possui produtos vinculados. Remova primeiro os produtos relacionados.",
      });
      return;
    }

    const confirmed = window.confirm(
      `Deseja realmente excluir a subcategoria "${subcategory.name}"?`
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("decor_subcategories")
      .delete()
      .eq("id", subcategory.id)
      .eq("company_id", company.id);

    if (error) {
      setStatus({
        type: "error",
        message: "Não foi possível excluir a subcategoria.",
      });
      return;
    }

    setStatus({
      type: "success",
      message: "Subcategoria excluída com sucesso.",
    });
    await loadAll();
  }

  async function handleDeleteProduct(product: Product) {
    if (!company?.id) return;

    const confirmed = window.confirm(
      `Deseja realmente excluir o produto "${product.name}"?`
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("decor_products")
      .delete()
      .eq("id", product.id)
      .eq("company_id", company.id);

    if (error) {
      setStatus({
        type: "error",
        message: "Não foi possível excluir o produto.",
      });
      return;
    }

    setStatus({
      type: "success",
      message: "Produto excluído com sucesso.",
    });
    await loadAll();
  }

  async function uploadProductImage(
    file: File,
    folder: "main" | "gallery"
  ): Promise<string | null> {
    if (!company?.id) return null;

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const fileName = `decor-products/${company.id}/${folder}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(fileName, file, {
          upsert: true,
        });

      if (uploadError) {
        setStatus({
          type: "error",
          message: "Não foi possível enviar a imagem.",
        });
        return null;
      }

      const { data } = supabase.storage
        .from("company-assets")
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch {
      setStatus({
        type: "error",
        message: "Ocorreu um erro inesperado ao enviar a imagem.",
      });
      return null;
    }
  }

  async function handleMainImageUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatus({
        type: "error",
        message: "Selecione uma imagem válida.",
      });
      e.target.value = "";
      return;
    }

    try {
      setUploadingMain(true);
      const imageUrl = await uploadProductImage(file, "main");

      if (!imageUrl) return;

      setProductForm((prev) => ({
        ...prev,
        image_url: imageUrl,
      }));

      setStatus({
        type: "success",
        message: "Imagem principal enviada com sucesso.",
      });
    } finally {
      setUploadingMain(false);
      e.target.value = "";
    }
  }

  async function handleGalleryUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setUploadingGallery(true);

      const uploadedUrls: string[] = [];

      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;

        const imageUrl = await uploadProductImage(file, "gallery");
        if (imageUrl) {
          uploadedUrls.push(imageUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        setProductForm((prev) => ({
          ...prev,
          gallery_urls: [...prev.gallery_urls, ...uploadedUrls],
        }));

        setStatus({
          type: "success",
          message: "Galeria enviada com sucesso.",
        });
      }
    } finally {
      setUploadingGallery(false);
      e.target.value = "";
    }
  }

  function removeGalleryImage(url: string) {
    setProductForm((prev) => ({
      ...prev,
      gallery_urls: prev.gallery_urls.filter((item) => item !== url),
    }));
  }

const filteredSubcategoriesForProduct = useMemo(() => {
  if (!productForm.category_id) {
    return subcategories.filter((item) => !item.category_id);
  }

  return subcategories.filter(
    (item) =>
      item.category_id === productForm.category_id || !item.category_id
  );
}, [productForm.category_id, subcategories]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      const category = categories.find((item) => item.id === product.category_id);
const productSubcategories = subcategories.filter(
  (item) =>
    Array.isArray(product.subcategory_ids) &&
    product.subcategory_ids.includes(item.id)
);

const matchesSearch =
  !normalizedSearch ||
  [
    product.name,
    product.description || "",
    category?.name || "",
    ...productSubcategories.map((item) => item.name || ""),
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedSearch);

      const matchesStatus =
        productFilter === "all"
          ? true
          : productFilter === "active"
          ? product.is_active !== false
          : product.is_active === false;

      const matchesCategory =
        selectedCategoryFilter === "all"
          ? true
          : product.category_id === selectedCategoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [
    products,
    categories,
    subcategories,
    search,
    productFilter,
    selectedCategoryFilter,
  ]);

  const stats = useMemo(() => {
    return {
      totalCategories: categories.length,
      totalSubcategories: subcategories.length,
      totalProducts: products.length,
      activeProducts: products.filter((item) => item.is_active !== false).length,
      featuredProducts: products.filter((item) => item.is_featured).length,
    };
  }, [categories, subcategories, products]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando produtos...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-100 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-indigo-100 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[12px] font-semibold text-blue-700">
              <Sparkles className="h-3.5 w-3.5" />
              Produtos e catálogo
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              Gerencie kits, temas e itens avulsos
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Cadastre categorias, subcategorias e produtos com imagem,
              descrição, valor e destaque, já alinhado com a página pública do
              seu catálogo.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Categorias"
              value={String(stats.totalCategories)}
            />
            <MetricCard
              label="Subcategorias"
              value={String(stats.totalSubcategories)}
            />
            <MetricCard label="Produtos" value={String(stats.totalProducts)} />
            <MetricCard
              label="Ativos"
              value={String(stats.activeProducts)}
            />
            <MetricCard
              label="Destaques"
              value={String(stats.featuredProducts)}
            />
            <MetricCard
              label="Empresa"
              value={company?.name || "—"}
              compact
            />
          </div>
        </div>
      </section>

      {status.message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            status.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          <div className="flex items-start gap-3">
            {status.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{status.message}</span>
          </div>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <FolderTree className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Categorias
                  </h2>
                  <p className="text-sm text-slate-500">
                    Organize a vitrine principal do catálogo.
                  </p>
                </div>
              </div>

                <button
                type="button"
                onClick={openNewCategoryModal}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
                >
                <Plus className="h-4 w-4" />
                Nova categoria
                </button>
            </div>

            <div className="space-y-3">
              {categories.length === 0 ? (
                <EmptyBox
                  title="Nenhuma categoria cadastrada"
                  description="Crie categorias como Menino, Menina, Adulto Feminino, Tapetes, Painéis e outras."
                />
              ) : (
                categories.map((category) => {
                  const count = products.filter(
                    (item) => item.category_id === category.id
                  ).length;

                  return (
                    <div
                      key={category.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {category.name}
                            </p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                category.is_active !== false
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {category.is_active !== false ? "Ativa" : "Inativa"}
                            </span>
                          </div>
                          <p className="mt-1 break-all text-xs text-slate-500">
                            /{category.slug}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span>Ordem: {category.sort_order ?? 0}</span>
                            <span>Produtos: {count}</span>
                            <span>
                              Subcategorias:{" "}
                              {
                                subcategories.filter(
                                  (item) => item.category_id === category.id
                                ).length
                              }
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => openNewSubcategoryModal(category.id)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            <Plus className="h-4 w-4" />
                            Sub
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditCategoryModal(category)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(category)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {subcategories.filter((item) => item.category_id === category.id)
                        .length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {subcategories
                            .filter((item) => item.category_id === category.id)
                            .map((sub) => (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => openEditSubcategoryModal(sub)}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                              >
                                <Tag className="h-3.5 w-3.5" />
                                {sub.name}
                              </button>
                            ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Subcategorias
                  </h2>
                  <p className="text-sm text-slate-500">
                    Temas e agrupamentos secundários.
                  </p>
                </div>
              </div>

<button
  type="button"
  onClick={() => openNewSubcategoryModal()}
  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
>
  <Plus className="h-4 w-4" />
  Nova sub
</button>
            </div>

            <div className="space-y-3">
              {subcategories.length === 0 ? (
                <EmptyBox
                  title="Nenhuma subcategoria cadastrada"
                  description="Você pode criar temas como Divertidamente, Ursinho Aviador, Princesa Cut e outros."
                />
              ) : (
                subcategories.map((subcategory) => {
                  const category = categories.find(
                    (item) => item.id === subcategory.category_id
                  );

                  return (
                    <div
                      key={subcategory.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {subcategory.name}
                            </p>
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                            {category?.name || "Global"}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                subcategory.is_active !== false
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {subcategory.is_active !== false ? "Ativa" : "Inativa"}
                            </span>
                          </div>
                          <p className="mt-1 break-all text-xs text-slate-500">
                            /{subcategory.slug}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span>Ordem: {subcategory.sort_order ?? 0}</span>
                            <span>
                              Produtos:{" "}
                            {
                            products.filter(
                                (item) =>
                                Array.isArray(item.subcategory_ids) &&
                                item.subcategory_ids.includes(subcategory.id)
                            ).length
                            }
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => openEditSubcategoryModal(subcategory)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSubcategory(subcategory)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Box className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Produtos
                  </h2>
                  <p className="text-sm text-slate-500">
                    Kits, painéis, tapetes, itens avulsos e temas da página pública.
                  </p>
                </div>
              </div>

<div className="flex flex-wrap gap-2">
  <button
    type="button"
    onClick={() => openNewProductModal()}
    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
  >
    <Plus className="h-4 w-4" />
    Novo kit/tema
  </button>

  <button
    type="button"
    onClick={() =>
      openNewProductModal(
        selectedCategoryFilter !== "all" ? selectedCategoryFilter : undefined,
        "loose"
      )
    }
    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
  >
    <Plus className="h-4 w-4" />
    Novo item avulso
  </button>
</div>
            </div>

            <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_180px_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, categoria, tema..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
                />
              </div>

              <div className="relative">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
                >
                  <option value="all">Todas categorias</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              <div className="relative">
                <select
                  value={productFilter}
                  onChange={(e) =>
                    setProductFilter(e.target.value as "all" | "active" | "inactive")
                  }
                  className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
                >
                  <option value="all">Todos status</option>
                  <option value="active">Somente ativos</option>
                  <option value="inactive">Somente inativos</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="space-y-4">
              {filteredProducts.length === 0 ? (
                <EmptyBox
                  title="Nenhum produto encontrado"
                  description="Cadastre produtos com foto, valor e descrição para alimentar sua página pública."
                />
              ) : (
                filteredProducts.map((product) => {
                  const category = categories.find(
                    (item) => item.id === product.category_id
                  );
                const productSubcategories = subcategories.filter(
                (item) =>
                    Array.isArray(product.subcategory_ids) &&
                    product.subcategory_ids.includes(item.id)
                );
                const mainImage = productMainImage(product);

                  return (
                    <div
                      key={product.id}
                      className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-4 md:flex-row">
                        <div className="flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white md:w-28">
                          {mainImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={mainImage}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                             <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-950">
                                {product.name}
                            </h3>

                          {product.product_type === "loose" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                              Item avulso
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                              Kit / tema
                            </span>
                          )}

                            {product.is_featured ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                <Star className="h-3.5 w-3.5 fill-current" />
                                Destaque
                                </span>
                            ) : null}

                            <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                product.is_active !== false
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-200 text-slate-600"
                                }`}
                            >
                                {product.is_active !== false ? "Ativo" : "Inativo"}
                            </span>
                            </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {category ? (
                                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                                    {category.name}
                                  </span>
                                ) : null}
{productSubcategories.map((subcategory) => (
  <span
    key={subcategory.id}
    className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700"
  >
    {subcategory.name}
  </span>
))}
                              </div>

                              <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                                {product.description || "Sem descrição."}
                              </p>

                              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                                <span>Slug: /{product.slug}</span>
                                <span>Ordem: {product.sort_order ?? 0}</span>
                                <span>
                                  Galeria:{" "}
                                  {Array.isArray(product.gallery_urls)
                                    ? product.gallery_urls.length
                                    : 0}
                                </span>
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
                              <div className="text-left lg:text-right">
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                                  Valor
                                </p>
                                <p className="mt-1 text-lg font-semibold text-slate-950">
                                  {formatPrice(product.price)}
                                </p>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditProductModal(product)}
                                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Editar
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(product)}
                                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Excluir
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      {categoryModalOpen ? (
        <ModalShell
          title={categoryForm.id ? "Editar categoria" : "Nova categoria"}
          subtitle="Estruture os grupos principais do catálogo."
          onClose={() => {
            setCategoryModalOpen(false);
            resetCategoryForm();
          }}
        >
          <form onSubmit={handleSaveCategory} className="space-y-5">
            <Field
              label="Nome da categoria"
              value={categoryForm.name}
              onChange={(value) =>
                setCategoryForm((prev) => ({
                  ...prev,
                  name: value,
                  slug:
                    !prev.slug || prev.slug === slugify(prev.name)
                      ? slugify(value)
                      : prev.slug,
                }))
              }
              placeholder="Ex: Menino"
              required
            />

            <Field
              label="Slug"
              value={categoryForm.slug}
              onChange={(value) =>
                setCategoryForm((prev) => ({ ...prev, slug: slugify(value) }))
              }
              placeholder="menino"
              required
            />

            <Field
              label="Ordem"
              value={String(categoryForm.sort_order)}
              onChange={(value) =>
                setCategoryForm((prev) => ({
                  ...prev,
                  sort_order: Number(value.replace(/\D/g, "") || 0),
                }))
              }
              placeholder="0"
            />

            <SwitchRow
              label="Categoria ativa"
              description="Categorias inativas deixam de aparecer no catálogo público."
              checked={categoryForm.is_active}
              onChange={(checked) =>
                setCategoryForm((prev) => ({ ...prev, is_active: checked }))
              }
            />

<div className="flex gap-3 pt-2">
  <button
    type="button"
    onClick={() => {
      setCategoryModalOpen(false);
      resetCategoryForm();
    }}
    className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
  >
    Cancelar
  </button>

  <button
    type="submit"
    disabled={savingCategory}
    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
  >
    {savingCategory ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        Salvando...
      </>
    ) : (
      <>
        <Save className="h-4 w-4" />
        Salvar categoria
      </>
    )}
  </button>
</div>
          </form>
        </ModalShell>
      ) : null}

      {subcategoryModalOpen ? (
        <ModalShell
          title={subcategoryForm.id ? "Editar subcategoria" : "Nova subcategoria"}
          subtitle="Organize temas e variações dentro de cada categoria."
          onClose={() => {
            setSubcategoryModalOpen(false);
            resetSubcategoryForm();
          }}
        >
          <form onSubmit={handleSaveSubcategory} className="space-y-5">
                <SelectField
                label="Categoria (opcional)"
              value={subcategoryForm.category_id}
              onChange={(value) =>
                setSubcategoryForm((prev) => ({ ...prev, category_id: value }))
              }
              required
            >
              <option value="">Sem categoria (global)</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectField>

            <Field
              label="Nome da subcategoria"
              value={subcategoryForm.name}
              onChange={(value) =>
                setSubcategoryForm((prev) => ({
                  ...prev,
                  name: value,
                  slug:
                    !prev.slug || prev.slug === slugify(prev.name)
                      ? slugify(value)
                      : prev.slug,
                }))
              }
              placeholder="Ex: Divertidamente"
              required
            />

            <Field
              label="Slug"
              value={subcategoryForm.slug}
              onChange={(value) =>
                setSubcategoryForm((prev) => ({ ...prev, slug: slugify(value) }))
              }
              placeholder="divertidamente"
              required
            />

            <Field
              label="Ordem"
              value={String(subcategoryForm.sort_order)}
              onChange={(value) =>
                setSubcategoryForm((prev) => ({
                  ...prev,
                  sort_order: Number(value.replace(/\D/g, "") || 0),
                }))
              }
              placeholder="0"
            />

            <SwitchRow
              label="Subcategoria ativa"
              description="Subcategorias inativas deixam de aparecer no catálogo público."
              checked={subcategoryForm.is_active}
              onChange={(checked) =>
                setSubcategoryForm((prev) => ({ ...prev, is_active: checked }))
              }
            />

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSubcategoryModalOpen(false);
                  resetSubcategoryForm();
                }}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={savingSubcategory}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {savingSubcategory ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar subcategoria
                  </>
                )}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {productModalOpen ? (
            <ModalShell
            title={productForm.id ? "Editar produto" : "Novo produto"}
            subtitle="Cadastre kits completos, temas decorativos e itens avulsos como tapete, boleira, bandeja, painel e complementos."
            onClose={() => {
                setProductModalOpen(false);
                resetProductForm();
            }}
            wide
            >
          <form onSubmit={handleSaveProduct} className="space-y-6">
<div className="grid gap-5 md:grid-cols-2">
  <SelectField
    label="Tipo do produto"
    value={productForm.product_type}
    onChange={(value) =>
      setProductForm((prev) => ({
        ...prev,
        product_type: value as "kit" | "loose",
      }))
    }
    required
  >
    <option value="kit">Kit / tema</option>
    <option value="loose">Item avulso</option>
  </SelectField>

  <SelectField
    label="Categoria"
    value={productForm.category_id}
    onChange={(value) =>
      setProductForm((prev) => ({
        ...prev,
        category_id: value,
        subcategory_ids: prev.subcategory_ids.filter((selectedId) =>
          subcategories.some(
            (item) =>
              item.id === selectedId &&
              (item.category_id === value || !item.category_id)
          )
        ),
      }))
    }
  >
    <option value="">Sem categoria</option>
    {categories.map((category) => (
      <option key={category.id} value={category.id}>
        {category.name}
      </option>
    ))}
  </SelectField>

<div>
  <label className="mb-2 block text-sm font-semibold text-slate-900">
    Subcategorias / tags
  </label>

  <div className="rounded-2xl border border-slate-200 bg-white p-3">
    {filteredSubcategoriesForProduct.length === 0 ? (
      <p className="text-sm text-slate-500">
        Nenhuma subcategoria disponível para esta categoria.
      </p>
    ) : (
      <div className="flex flex-wrap gap-2">
        {filteredSubcategoriesForProduct.map((subcategory) => {
          const checked = productForm.subcategory_ids.includes(subcategory.id);

          return (
            <button
              key={subcategory.id}
              type="button"
              onClick={() =>
                setProductForm((prev) => ({
                  ...prev,
                  subcategory_ids: checked
                    ? prev.subcategory_ids.filter((id) => id !== subcategory.id)
                    : [...prev.subcategory_ids, subcategory.id],
                }))
              }
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                checked
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  checked ? "bg-white" : "bg-slate-300"
                }`}
              />
              {subcategory.name}
            </button>
          );
        })}
      </div>
    )}
  </div>

  {productForm.subcategory_ids.length > 0 ? (
    <div className="mt-3 flex flex-wrap gap-2">
      {productForm.subcategory_ids.map((id) => {
        const sub = subcategories.find((item) => item.id === id);
        if (!sub) return null;

        return (
          <span
            key={id}
            className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700"
          >
            {sub.name}
            <button
              type="button"
              onClick={() =>
                setProductForm((prev) => ({
                  ...prev,
                  subcategory_ids: prev.subcategory_ids.filter(
                    (item) => item !== id
                  ),
                }))
              }
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-200 text-violet-800"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
    </div>
  ) : null}
</div>

                    <Field
                    label="Nome do produto"
                    value={productForm.name}
                    onChange={(value) =>
                        setProductForm((prev) => ({
                        ...prev,
                        name: value,
                        slug:
                            !prev.slug || prev.slug === slugify(prev.name)
                            ? slugify(value)
                            : prev.slug,
                        }))
                    }
                    placeholder="Ex: Kit Básico Ursinho Aviador ou Boleira Dourada"
                    required
                    />

              <Field
                label="Slug"
                value={productForm.slug}
                onChange={(value) =>
                  setProductForm((prev) => ({ ...prev, slug: slugify(value) }))
                }
                placeholder="kit-basico-ursinho-aviador"
                required
              />

              <Field
                label="Valor"
                value={productForm.price}
                onChange={(value) =>
                  setProductForm((prev) => ({
                    ...prev,
                    price: value.replace(",", "."),
                  }))
                }
                placeholder="130.00"
              />

              <Field
                label="Ordem"
                value={String(productForm.sort_order)}
                onChange={(value) =>
                  setProductForm((prev) => ({
                    ...prev,
                    sort_order: Number(value.replace(/\D/g, "") || 0),
                  }))
                }
                placeholder="0"
              />

                <div className="md:col-span-2">
                <TextAreaField
                    label="Descrição / o que acompanha"
                    value={productForm.description}
                    onChange={(value) =>
                    setProductForm((prev) => ({ ...prev, description: value }))
                    }
                    placeholder={`Ex kit:
                Painel redondo
                3 cilindros
                Bandejas decorativas
                Tapete não incluso

                Ex item avulso:
                Item avulso para complementar kit.
                1 boleira dourada
                Ideal para compor a decoração`}
                    rows={6}
                />
                </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Imagem principal
                    </p>
                    <p className="text-xs text-slate-500">
                      Essa imagem costuma ser a capa principal do card público.
                    </p>
                  </div>

                  <div className="flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {productForm.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={productForm.image_url}
                        alt="Imagem principal"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-slate-400" />
                    )}
                  </div>

                  <div className="mt-3 grid gap-2">
                    <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                      {uploadingMain ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Importar imagem principal
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleMainImageUpload}
                      />
                    </label>

                    {productForm.image_url ? (
                      <button
                        type="button"
                        onClick={() =>
                          setProductForm((prev) => ({
                            ...prev,
                            image_url: "",
                          }))
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover imagem principal
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Configurações do produto
                    </p>
                    <p className="text-xs text-slate-500">
                      Defina visibilidade e destaque na página pública.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <SwitchRow
                      label="Produto em destaque"
                      description="Aparece na área de destaques da vitrine pública."
                      checked={productForm.is_featured}
                      onChange={(checked) =>
                        setProductForm((prev) => ({
                          ...prev,
                          is_featured: checked,
                        }))
                      }
                    />

                    <SwitchRow
                      label="Produto ativo"
                      description="Produtos inativos deixam de aparecer no catálogo."
                      checked={productForm.is_active}
                      onChange={(checked) =>
                        setProductForm((prev) => ({
                          ...prev,
                          is_active: checked,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Galeria do produto
                    </p>
                    <p className="text-xs text-slate-500">
                      Você pode adicionar mais fotos do mesmo kit ou item.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {productForm.gallery_urls.length === 0 ? (
                      <div className="col-span-full flex h-36 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-400">
                        Nenhuma imagem na galeria
                      </div>
                    ) : (
                      productForm.gallery_urls.map((url) => (
                        <div
                          key={url}
                          className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt="Galeria"
                            className="h-36 w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(url)}
                            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-3">
                    <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                      {uploadingGallery ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Importar galeria
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleGalleryUpload}
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Preview rápido
                    </p>
                    <p className="text-xs text-slate-500">
                      Visual simplificado de como o card tende a aparecer.
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-[#0b1018] shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
                    <div className="relative aspect-[0.84/1] overflow-hidden bg-[#121a2e]">
                      {productMainImage(productForm) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={productMainImage(productForm)}
                          alt={productForm.name || "Preview"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/35">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="mb-2 flex flex-wrap gap-2">
                        {categories.find((item) => item.id === productForm.category_id) ? (
                          <span className="rounded-full bg-[#f59e0b]/15 px-2.5 py-1 text-[11px] font-semibold text-[#fbbf24]">
                            {
                              categories.find(
                                (item) => item.id === productForm.category_id
                              )?.name
                            }
                          </span>
                        ) : null}

                            {productForm.subcategory_ids.map((subcategoryId) => {
                            const subcategory = subcategories.find(
                                (item) => item.id === subcategoryId
                            );

                            if (!subcategory) return null;

                            return (
                                <span
                                key={subcategory.id}
                                className="rounded-full bg-[#60a5fa]/15 px-2.5 py-1 text-[11px] font-semibold text-[#93c5fd]"
                                >
                                {subcategory.name}
                                </span>
                            );
                            })}
                      </div>

                      <h3 className="line-clamp-2 text-sm font-semibold text-white sm:text-[15px]">
                        {productForm.name || "Nome do produto"}
                      </h3>

                      <p className="mt-2 line-clamp-2 min-h-[36px] text-xs leading-5 text-white/60 sm:text-sm">
                        {productForm.description ||
                          "Descrição do produto, kit ou item avulso."}
                      </p>

                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.12em] text-white/35">
                            Valor
                          </p>
                          <p className="text-sm font-semibold text-[#a78bfa] sm:text-base">
                            {formatPrice(productForm.price)}
                          </p>
                        </div>

                        <div className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-xs font-semibold text-white sm:text-sm">
                          Adicionar
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

<div className="mt-4 pb-[calc(env(safe-area-inset-bottom)+28px)]">
  <div className="flex flex-col gap-3 sm:flex-row">
    <button
      type="button"
      onClick={() => {
        setProductModalOpen(false);
        resetProductForm();
      }}
      className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:flex-1"
    >
      Cancelar
    </button>

    <button
      type="submit"
      disabled={savingProduct}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60 sm:flex-1"
    >
      {savingProduct ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Salvando...
        </>
      ) : (
        <>
          <Save className="h-4 w-4" />
          Salvar produto
        </>
      )}
    </button>
  </div>
</div>
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 font-semibold text-slate-900 ${
          compact ? "text-sm" : "text-lg"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyBox({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
        <GripVertical className="h-5 w-5" />
      </div>
      <p className="mt-4 text-base font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <div
        className={`max-h-[92vh] w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.18)] ${
          wide ? "max-w-6xl" : "max-w-2xl"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

<div className="max-h-[calc(92vh-88px)] overflow-y-auto px-4 pt-4 pb-24 sm:px-6 sm:pt-6 sm:pb-6">
  {children}
</div>
      </div>
    </div>
  );
}

function SwitchRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-11 w-[76px] items-center rounded-full px-1 transition ${
          checked ? "bg-slate-950" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-9 w-9 rounded-full bg-white shadow-sm transition ${
            checked ? "translate-x-[30px]" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: FieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
        >
          {children}
        </select>

        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 5,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
      />
    </div>
  );
}