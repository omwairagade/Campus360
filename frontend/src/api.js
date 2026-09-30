const API_BASE_URL = "https://campus360-backend-gbf0.onrender.com/api";

/* =========================================================
   AUTHENTICATION TOKEN
========================================================= */

const getToken = () => {
  return localStorage.getItem("token");
};

/* =========================================================
   GENERIC API REQUEST
========================================================= */

export const apiRequest = async (
  endpoint,
  options = {}
) => {
  const token = getToken();

  const isFormData =
    options.body instanceof FormData;

  const headers = {
    ...(isFormData
      ? {}
      : {
          "Content-Type": "application/json",
        }),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  let data = null;

  const contentType =
    response.headers.get("content-type") || "";

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text || null;
  }

  /* =======================================================
     IMPROVED ERROR HANDLING
  ======================================================= */

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      (typeof data === "string" && data) ||
      `Request failed with status ${response.status}`;

    console.error("API Error:", {
      endpoint,
      method: options.method || "GET",
      status: response.status,
      statusText: response.statusText,
      response: data,
    });

    throw new Error(message);
  }

  return data;
};

/* =========================================================
   GET
========================================================= */

export const apiGet = async (endpoint) => {
  return apiRequest(endpoint, {
    method: "GET",
  });
};

/* =========================================================
   POST
========================================================= */

export const apiPost = async (
  endpoint,
  body
) => {
  return apiRequest(endpoint, {
    method: "POST",
    body:
      body instanceof FormData
        ? body
        : JSON.stringify(body),
  });
};

/* =========================================================
   PUT
========================================================= */

export const apiPut = async (
  endpoint,
  body
) => {
  return apiRequest(endpoint, {
    method: "PUT",
    body:
      body instanceof FormData
        ? body
        : JSON.stringify(body),
  });
};

/* =========================================================
   PATCH
========================================================= */

export const apiPatch = async (
  endpoint,
  body
) => {
  return apiRequest(endpoint, {
    method: "PATCH",
    body:
      body instanceof FormData
        ? body
        : JSON.stringify(body),
  });
};

/* =========================================================
   DELETE
========================================================= */

export const apiDelete = async (
  endpoint
) => {
  return apiRequest(endpoint, {
    method: "DELETE",
  });
};

/* =========================================================
   STUDENT PROFILE
========================================================= */

export const getStudentProfile = async () => {
  const token = getToken();

  if (!token) {
    throw new Error(
      "Authentication token not found"
    );
  }

  return apiGet("/student/profile");
};

/* =========================================================
   LOGIN
=========================================================

   Students:
   - Campus360 email
   - Registered phone number

   Admin / Faculty:
   - Institutional email
========================================================= */

export const loginUser = async (
  identifier,
  password,
  captchaToken
) => {
  const response = await fetch(
    `${API_BASE_URL}/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        identifier: String(
          identifier || ""
        ).trim(),

        password,

        captchaToken,
      }),
    }
  );

  let data = null;

  const contentType =
    response.headers.get("content-type") || "";

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text || null;
  }

  if (!response.ok) {
    console.error("Login API Error:", {
      endpoint: "/auth/login",
      status: response.status,
      statusText: response.statusText,
      response: data,
    });

    throw new Error(
      data?.message ||
        data?.error ||
        "Login failed"
    );
  }

  if (data?.token) {
    localStorage.setItem(
      "token",
      data.token
    );
  }

  if (data?.user) {
    localStorage.setItem(
      "user",
      JSON.stringify(data.user)
    );
  }

  return data;
};

/* =========================================================
   LOGOUT
========================================================= */

export const logoutUser = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

/* =========================================================
   LOGGED-IN USER
========================================================= */

export const getLoggedInUser = () => {
  const user =
    localStorage.getItem("user");

  if (!user) {
    return null;
  }

  try {
    return JSON.parse(user);
  } catch (error) {
    console.error(
      "Failed to parse logged-in user:",
      error
    );

    return null;
  }
};

/* =========================================================
   AUTHENTICATION CHECK
========================================================= */

export const isAuthenticated = () => {
  return Boolean(getToken());
};

/* =========================================================
   ADMIN - DEPARTMENTS
========================================================= */

export const getAdminDepartments = async (
  query = ""
) => {
  return apiGet(
    `/admin/departments${query}`
  );
};

export const getAdminDepartmentById = async (
  id
) => {
  return apiGet(
    `/admin/departments/${id}`
  );
};

export const createAdminDepartment = async (
  body
) => {
  return apiPost(
    "/admin/departments",
    body
  );
};

export const updateAdminDepartment = async (
  id,
  body
) => {
  return apiPatch(
    `/admin/departments/${id}`,
    body
  );
};

export const deleteAdminDepartment = async (
  id
) => {
  return apiDelete(
    `/admin/departments/${id}`
  );
};

/* =========================================================
   ADMIN - PROGRAMS
========================================================= */

export const getAdminPrograms = async (
  query = ""
) => {
  return apiGet(
    `/admin/programs${query}`
  );
};

export const getAdminProgramById = async (
  id
) => {
  return apiGet(
    `/admin/programs/${id}`
  );
};

export const createAdminProgram = async (
  body
) => {
  return apiPost(
    "/admin/programs",
    body
  );
};

export const updateAdminProgram = async (
  id,
  body
) => {
  return apiPatch(
    `/admin/programs/${id}`,
    body
  );
};

export const deleteAdminProgram = async (
  id
) => {
  return apiDelete(
    `/admin/programs/${id}`
  );
};

/* =========================================================
   ADMIN - ACADEMIC YEARS
========================================================= */

export const getAdminAcademicYears = async (
  query = ""
) => {
  return apiGet(
    `/admin/academic-years${query}`
  );
};

export const getAdminAcademicYearById =
  async (id) => {
    return apiGet(
      `/admin/academic-years/${id}`
    );
  };

export const createAdminAcademicYear =
  async (body) => {
    return apiPost(
      "/admin/academic-years",
      body
    );
  };

export const updateAdminAcademicYear =
  async (
    id,
    body
  ) => {
    return apiPatch(
      `/admin/academic-years/${id}`,
      body
    );
  };

export const deleteAdminAcademicYear =
  async (id) => {
    return apiDelete(
      `/admin/academic-years/${id}`
    );
  };

/* =========================================================
   ADMIN - FEE STRUCTURES
========================================================= */

export const getAdminFeeStructures = async (
  query = ""
) => {
  return apiGet(
    `/admin/fee-structures${query}`
  );
};

export const getAdminFeeStructureById =
  async (id) => {
    return apiGet(
      `/admin/fee-structures/${id}`
    );
  };

export const createAdminFeeStructure =
  async (body) => {
    return apiPost(
      "/admin/fee-structures",
      body
    );
  };

export const updateAdminFeeStructure =
  async (
    id,
    body
  ) => {
    return apiPatch(
      `/admin/fee-structures/${id}`,
      body
    );
  };

export const deleteAdminFeeStructure =
  async (id) => {
    return apiDelete(
      `/admin/fee-structures/${id}`
    );
  };

/* =========================================================
   API BASE URL
========================================================= */

export {
  API_BASE_URL,
};