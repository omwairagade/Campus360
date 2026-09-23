import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  Activity,
  AlertCircle,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Filter,
  GraduationCap,
  Layers3,
  LayoutGrid,
  List,
  MapPin,
  Pencil,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
} from "lucide-react";

import {
  apiGet,
  apiPut,
  apiDelete,
  logoutUser,
} from "../api";

/* ============================================================
   CONSTANTS
============================================================ */

const DAYS = [
  {
    id: 1,
    label: "Monday",
    short: "Mon",
  },
  {
    id: 2,
    label: "Tuesday",
    short: "Tue",
  },
  {
    id: 3,
    label: "Wednesday",
    short: "Wed",
  },
  {
    id: 4,
    label: "Thursday",
    short: "Thu",
  },
  {
    id: 5,
    label: "Friday",
    short: "Fri",
  },
  {
    id: 6,
    label: "Saturday",
    short: "Sat",
  },
  {
    id: 7,
    label: "Sunday",
    short: "Sun",
  },
];

const BATCH_OPTIONS = [
  {
    value: "ALL",
    label: "All Batches",
  },
  {
    value: "COMMON",
    label: "Common / All Batches",
  },
  {
    value: "1",
    label: "Batch 1",
  },
  {
    value: "2",
    label: "Batch 2",
  },
  {
    value: "3",
    label: "Batch 3",
  },
];

const TYPE_OPTIONS = [
  {
    value: "ALL",
    label: "All Types",
  },
  {
    value: "Lecture",
    label: "Lecture",
  },
  {
    value: "Practical",
    label: "Practical",
  },
];

/* ============================================================
   GENERAL HELPERS
============================================================ */

function getBatchLabel(batch) {
  if (
    batch === null ||
    batch === undefined ||
    String(batch).trim() === ""
  ) {
    return "Common / All";
  }

  const normalizedBatch =
    String(batch);

  if (normalizedBatch === "1") {
    return "Batch 1";
  }

  if (normalizedBatch === "2") {
    return "Batch 2";
  }

  if (normalizedBatch === "3") {
    return "Batch 3";
  }

  return `Batch ${normalizedBatch}`;
}

function getBatchBadgeClass(batch) {
  if (
    batch === null ||
    batch === undefined ||
    String(batch).trim() === ""
  ) {
    return "bg-slate-100 text-slate-700";
  }

  if (String(batch) === "1") {
    return "bg-blue-50 text-blue-700";
  }

  if (String(batch) === "2") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (String(batch) === "3") {
    return "bg-violet-50 text-violet-700";
  }

  return "bg-slate-100 text-slate-700";
}

function isCommonBatch(batch) {
  return (
    batch === null ||
    batch === undefined ||
    String(batch).trim() === ""
  );
}

function getClassType(entry) {
  return (
    entry?.classType ||
    entry?.sessionType ||
    entry?.type ||
    "Lecture"
  );
}

function getCourseName(entry) {
  return (
    entry?.course?.name ||
    entry?.course?.title ||
    entry?.courseName ||
    "Course"
  );
}

function getCourseCode(entry) {
  return (
    entry?.course?.code ||
    entry?.course?.courseCode ||
    entry?.courseCode ||
    "COURSE"
  );
}

function getRoom(entry) {
  return (
    entry?.room ||
    entry?.roomNumber ||
    entry?.classroom ||
    "Room not assigned"
  );
}

function getSemester(entry) {
  return (
    entry?.course?.semester ??
    entry?.semester ??
    "—"
  );
}

function getFacultyName(faculty) {
  if (faculty?.user) {
    const fullName =
      `${faculty.user.firstName || ""} ${faculty.user.lastName || ""}`.trim();

    return (
      fullName ||
      faculty.user.name ||
      "Faculty Member"
    );
  }

  return (
    faculty?.name ||
    faculty?.fullName ||
    "Faculty Member"
  );
}

function formatTime(value) {
  if (!value) {
    return "—";
  }

  const text = String(value);

  const match = text.match(
    /^(\d{1,2}):(\d{2})/
  );

  if (!match) {
    return text;
  }

  const hour =
    Number(match[1]);

  const minute =
    match[2];

  if (
    hour < 0 ||
    hour > 23
  ) {
    return text;
  }

  const suffix =
    hour >= 12
      ? "PM"
      : "AM";

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

function convertTimeToMinutes(value) {
  if (!value) {
    return null;
  }

  const text = String(value);

  const match = text.match(
    /^(\d{1,2}):(\d{2})/
  );

  if (!match) {
    return null;
  }

  const hour =
    Number(match[1]);

  const minute =
    Number(match[2]);

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return (
    hour * 60 +
    minute
  );
}

function getDurationMinutes(entry) {
  const start =
    convertTimeToMinutes(
      entry?.startTime
    );

  const end =
    convertTimeToMinutes(
      entry?.endTime
    );

  if (
    start === null ||
    end === null ||
    end <= start
  ) {
    return 0;
  }

  return end - start;
}

function getDayName(dayId) {
  return (
    DAYS.find(
      (day) =>
        day.id ===
        Number(dayId)
    )?.label ||
    "Unknown"
  );
}

function getTodayId() {
  return (
    new Date().getDay() || 7
  );
}

function getMinutesFromCurrentTime() {
  const now =
    new Date();

  return (
    now.getHours() * 60 +
    now.getMinutes()
  );
}

function getEntryStatus(entry) {
  const day =
    Number(
      entry?.dayOfWeek
    );

  if (day !== getTodayId()) {
    return "upcoming";
  }

  const start =
    convertTimeToMinutes(
      entry?.startTime
    );

  const end =
    convertTimeToMinutes(
      entry?.endTime
    );

  if (
    start === null ||
    end === null
  ) {
    return "upcoming";
  }

  const current =
    getMinutesFromCurrentTime();

  if (
    current >= start &&
    current < end
  ) {
    return "live";
  }

  if (current < start) {
    return "upcoming";
  }

  return "completed";
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

function FacultyTimetable() {
  const navigate =
    useNavigate();

  const [
    faculty,
    setFaculty,
  ] = useState(null);

  const [
    timetable,
    setTimetable,
  ] = useState([]);

  const [
    selectedDay,
    setSelectedDay,
  ] = useState(
    getTodayId()
  );

  const [
    batchFilter,
    setBatchFilter,
  ] = useState("ALL");

  const [
    typeFilter,
    setTypeFilter,
  ] = useState("ALL");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    sortBy,
    setSortBy,
  ] = useState("time");

  const [
    viewMode,
    setViewMode,
  ] = useState("grid");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    deletingId,
    setDeletingId,
  ] = useState(null);

  const [
    currentTime,
    setCurrentTime,
  ] = useState(
    new Date()
  );

  /* ==========================================================
     EDIT STATE
  ========================================================== */

  const [
    editingEntry,
    setEditingEntry,
  ] = useState(null);

  const [
    editForm,
    setEditForm,
  ] = useState({
    dayOfWeek: "1",
    startTime: "",
    endTime: "",
    room: "",
    classType: "Lecture",
    batch: "",
  });

  const [
    savingEdit,
    setSavingEdit,
  ] = useState(false);

  /* ==========================================================
     CLOCK
  ========================================================== */

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        setCurrentTime(
          new Date()
        );
      }, 30000);

    return () =>
      window.clearInterval(
        interval
      );
  }, []);

  /* ==========================================================
     ERROR HANDLER
  ========================================================== */

  const handleApiError =
    (err) => {
      const message =
        err?.message ||
        "An unexpected error occurred.";

      if (
        /authentication|unauthorized|forbidden|token/i.test(
          message
        )
      ) {
        logoutUser();
        navigate("/");
        return;
      }

      setError(message);
    };

  /* ==========================================================
     LOAD TIMETABLE
  ========================================================== */

  const loadTimetable = async (
    isRefresh = false
  ) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const data =
        await apiGet(
          "/timetable/faculty/my-timetable"
        );

      setFaculty(
        data?.faculty ||
          data?.data?.faculty ||
          null
      );

      const loadedTimetable =
        data?.timetable ||
        data?.data?.timetable ||
        data?.data ||
        [];

      setTimetable(
        Array.isArray(
          loadedTimetable
        )
          ? loadedTimetable
          : []
      );
    } catch (err) {
      console.error(
        "Faculty timetable error:",
        err
      );

      handleApiError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, []);

  /* ==========================================================
     ACTIVE FILTERED TIMETABLE
  ========================================================== */

  const filteredTimetable =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const result =
        timetable.filter(
          (entry) => {
            const entryBatch =
              entry?.batch;

            const entryType =
              getClassType(
                entry
              );

            const searchableText =
              [
                getCourseName(
                  entry
                ),
                getCourseCode(
                  entry
                ),
                getRoom(entry),
                entryType,
                getBatchLabel(
                  entryBatch
                ),
                String(
                  getSemester(
                    entry
                  )
                ),
                getDayName(
                  entry?.dayOfWeek
                ),
              ]
                .join(" ")
                .toLowerCase();

            const matchesSearch =
              !query ||
              searchableText.includes(
                query
              );

            const matchesBatch =
              batchFilter ===
                "ALL" ||
              (batchFilter ===
                "COMMON" &&
                isCommonBatch(
                  entryBatch
                )) ||
              (batchFilter !==
                "COMMON" &&
                batchFilter !==
                  "ALL" &&
                String(
                  entryBatch
                ) ===
                  String(
                    batchFilter
                  ));

            const matchesType =
              typeFilter ===
                "ALL" ||
              entryType.toLowerCase() ===
                typeFilter.toLowerCase();

            return (
              matchesSearch &&
              matchesBatch &&
              matchesType
            );
          }
        );

      return [...result].sort(
        (a, b) => {
          if (
            sortBy ===
            "course"
          ) {
            return getCourseName(
              a
            ).localeCompare(
              getCourseName(
                b
              )
            );
          }

          if (
            sortBy ===
            "room"
          ) {
            return getRoom(
              a
            ).localeCompare(
              getRoom(b)
            );
          }

          if (
            sortBy ===
            "duration"
          ) {
            return (
              getDurationMinutes(
                b
              ) -
              getDurationMinutes(
                a
              )
            );
          }

          return (
            (
              convertTimeToMinutes(
                a?.startTime
              ) || 0
            ) -
            (
              convertTimeToMinutes(
                b?.startTime
              ) || 0
            )
          );
        }
      );
    }, [
      timetable,
      search,
      batchFilter,
      typeFilter,
      sortBy,
    ]);

  /* ==========================================================
     SELECTED DAY
  ========================================================== */

  const selectedDayEntries =
    useMemo(() => {
      return filteredTimetable
        .filter(
          (entry) =>
            Number(
              entry?.dayOfWeek
            ) ===
            Number(
              selectedDay
            )
        )
        .sort(
          (a, b) =>
            (
              convertTimeToMinutes(
                a?.startTime
              ) || 0
            ) -
            (
              convertTimeToMinutes(
                b?.startTime
              ) || 0
            )
        );
    }, [
      filteredTimetable,
      selectedDay,
    ]);

  /* ==========================================================
     TODAY ENTRIES
  ========================================================== */

  const todayEntries =
    useMemo(() => {
      return filteredTimetable
        .filter(
          (entry) =>
            Number(
              entry?.dayOfWeek
            ) ===
            getTodayId()
        )
        .sort(
          (a, b) =>
            (
              convertTimeToMinutes(
                a?.startTime
              ) || 0
            ) -
            (
              convertTimeToMinutes(
                b?.startTime
              ) || 0
            )
        );
    }, [filteredTimetable]);

  /* ==========================================================
     LIVE / NEXT CLASS
  ========================================================== */

  const liveClass =
    useMemo(() => {
      return (
        todayEntries.find(
          (entry) =>
            getEntryStatus(
              entry
            ) === "live"
        ) || null
      );
    }, [
      todayEntries,
      currentTime,
    ]);

  const nextClass =
    useMemo(() => {
      const now =
        getMinutesFromCurrentTime();

      return (
        todayEntries.find(
          (entry) => {
            const start =
              convertTimeToMinutes(
                entry?.startTime
              );

            return (
              start !== null &&
              start > now
            );
          }
        ) || null
      );
    }, [
      todayEntries,
      currentTime,
    ]);

  const minutesUntilNext =
    useMemo(() => {
      if (!nextClass) {
        return null;
      }

      const start =
        convertTimeToMinutes(
          nextClass.startTime
        );

      if (start === null) {
        return null;
      }

      const current =
        getMinutesFromCurrentTime();

      return Math.max(
        0,
        start - current
      );
    }, [
      nextClass,
      currentTime,
    ]);

  /* ==========================================================
     WEEKLY ANALYTICS
  ========================================================== */

  const totalHours =
    filteredTimetable.reduce(
      (total, entry) =>
        total +
        getDurationMinutes(
          entry
        ) /
          60,
      0
    );

  const totalMinutes =
    filteredTimetable.reduce(
      (total, entry) =>
        total +
        getDurationMinutes(
          entry
        ),
      0
    );

  const uniqueCourses =
    new Set(
      filteredTimetable
        .map(
          (entry) =>
            entry?.courseId ||
            entry?.course?.id ||
            getCourseCode(
              entry
            )
        )
        .filter(Boolean)
    ).size;

  const uniqueBatches =
    new Set(
      filteredTimetable.map(
        (entry) =>
          isCommonBatch(
            entry?.batch
          )
            ? "COMMON"
            : String(
                entry?.batch
              )
      )
    ).size;

  const uniqueRooms =
    new Set(
      filteredTimetable
        .map(
          (entry) =>
            getRoom(entry)
        )
        .filter(
          (value) =>
            value &&
            value !==
              "Room not assigned"
        )
    ).size;

  const practicalClasses =
    filteredTimetable.filter(
      (entry) =>
        getClassType(
          entry
        ).toLowerCase() ===
          "practical" ||
        getClassType(
          entry
        ).toLowerCase() ===
          "lab"
    ).length;

  const lectureClasses =
    filteredTimetable.filter(
      (entry) =>
        !(
          getClassType(
            entry
          ).toLowerCase() ===
            "practical" ||
          getClassType(
            entry
          ).toLowerCase() ===
            "lab"
        )
    ).length;

  const busiestDay =
    useMemo(() => {
      const counts =
        DAYS.map((day) => {
          const entries =
            filteredTimetable.filter(
              (entry) =>
                Number(
                  entry?.dayOfWeek
                ) === day.id
            );

          const minutes =
            entries.reduce(
              (
                total,
                entry
              ) =>
                total +
                getDurationMinutes(
                  entry
                ),
              0
            );

          return {
            ...day,
            count:
              entries.length,
            minutes,
          };
        });

      return counts.sort(
        (a, b) =>
          b.minutes -
          a.minutes
      )[0];
    }, [filteredTimetable]);

  const dayStats =
    useMemo(() => {
      return DAYS.map(
        (day) => {
          const entries =
            filteredTimetable.filter(
              (entry) =>
                Number(
                  entry?.dayOfWeek
                ) === day.id
            );

          const minutes =
            entries.reduce(
              (
                total,
                entry
              ) =>
                total +
                getDurationMinutes(
                  entry
                ),
              0
            );

          return {
            ...day,
            count:
              entries.length,
            hours:
              minutes / 60,
          };
        }
      );
    }, [filteredTimetable]);

  const maxDayHours =
    Math.max(
      ...dayStats.map(
        (day) =>
          day.hours
      ),
      1
    );

  /* ==========================================================
     TYPE DISTRIBUTION
  ========================================================== */

  const typeDistribution =
    useMemo(() => {
      const map =
        new Map();

      filteredTimetable.forEach(
        (entry) => {
          const type =
            getClassType(
              entry
            );

          map.set(
            type,
            (map.get(type) ||
              0) + 1
          );
        }
      );

      return [
        ...map.entries(),
      ].sort(
        (a, b) =>
          b[1] - a[1]
      );
    }, [
      filteredTimetable,
    ]);

  /* ==========================================================
     FILTER STATE
  ========================================================== */

  const hasFilters =
    Boolean(
      search.trim()
    ) ||
    batchFilter !==
      "ALL" ||
    typeFilter !==
      "ALL";

  const clearFilters =
    () => {
      setSearch("");
      setBatchFilter("ALL");
      setTypeFilter("ALL");
      setSortBy("time");
    };

  /* ==========================================================
     DELETE
  ========================================================== */

  const handleDelete = async (
    entryId
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this timetable entry?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        entryId
      );

      setError("");

      await apiDelete(
        `/timetable/${entryId}`
      );

      await loadTimetable(
        true
      );
    } catch (err) {
      console.error(
        "Delete timetable error:",
        err
      );

      handleApiError(err);
    } finally {
      setDeletingId(null);
    }
  };

  /* ==========================================================
     EDIT
  ========================================================== */

  const openEditModal = (
    entry
  ) => {
    setEditingEntry(entry);

    setEditForm({
      dayOfWeek: String(
        entry?.dayOfWeek || 1
      ),

      startTime:
        entry?.startTime
          ? String(
              entry.startTime
            ).slice(0, 5)
          : "",

      endTime:
        entry?.endTime
          ? String(
              entry.endTime
            ).slice(0, 5)
          : "",

      room:
        entry?.room ||
        entry?.roomNumber ||
        entry?.classroom ||
        "",

      classType:
        getClassType(entry),

      batch:
        isCommonBatch(
          entry?.batch
        )
          ? ""
          : String(
              entry.batch
            ),
    });

    setError("");
  };

  const closeEditModal =
    () => {
      if (savingEdit) {
        return;
      }

      setEditingEntry(null);

      setEditForm({
        dayOfWeek: "1",
        startTime: "",
        endTime: "",
        room: "",
        classType: "Lecture",
        batch: "",
      });
    };

  const handleEditChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setEditForm(
        (previous) => ({
          ...previous,
          [name]: value,
        })
      );
    };

  const handleUpdate =
    async (event) => {
      event.preventDefault();

      if (!editingEntry) {
        return;
      }

      if (
        !editForm.startTime ||
        !editForm.endTime
      ) {
        setError(
          "Start time and end time are required."
        );

        return;
      }

      const start =
        convertTimeToMinutes(
          editForm.startTime
        );

      const end =
        convertTimeToMinutes(
          editForm.endTime
        );

      if (
        start === null ||
        end === null ||
        end <= start
      ) {
        setError(
          "End time must be later than start time."
        );

        return;
      }

      try {
        setSavingEdit(true);
        setError("");

        await apiPut(
          `/timetable/${editingEntry.id}`,
          {
            courseId:
              editingEntry.courseId ||
              editingEntry.course?.id,

            facultyId:
              editingEntry.facultyId ||
              faculty?.id,

            dayOfWeek:
              Number(
                editForm.dayOfWeek
              ),

            startTime:
              editForm.startTime,

            endTime:
              editForm.endTime,

            room:
              editForm.room.trim() ||
              null,

            classType:
              editForm.classType,

            batch:
              editForm.batch
                ? editForm.batch
                : null,
          }
        );

        closeEditModal();

        await loadTimetable(
          true
        );
      } catch (err) {
        console.error(
          "Update timetable error:",
          err
        );

        handleApiError(err);
      } finally {
        setSavingEdit(false);
      }
    };

  /* ==========================================================
     RESET SELECTED DAY TO TODAY
  ========================================================== */

  const goToToday = () => {
    setSelectedDay(
      getTodayId()
    );
  };

  /* ==========================================================
     UI
  ========================================================== */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">

        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex min-w-0 items-center gap-3">

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/faculty/dashboard"
                  )
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                title="Back to dashboard"
              >
                <ArrowLeft
                  size={19}
                />
              </button>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <CalendarDays
                  size={22}
                />
              </div>

              <div className="min-w-0">

                <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                  Faculty Portal
                </p>

                <h1 className="truncate text-xl font-bold md:text-2xl">
                  Timetable
                </h1>

                <p className="hidden text-sm text-slate-500 sm:block">
                  Manage your teaching schedule
                </p>

              </div>

            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={() =>
                  loadTimetable(
                    true
                  )
                }
                disabled={
                  refreshing
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
              >

                <RefreshCw
                  size={17}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                <span className="hidden sm:inline">
                  {refreshing
                    ? "Refreshing..."
                    : "Refresh"}
                </span>

              </button>

              <button
                type="button"
                onClick={
                  goToToday
                }
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 sm:px-4"
              >

                <CalendarDays
                  size={17}
                />

                <span className="hidden sm:inline">
                  Today
                </span>

              </button>

            </div>

          </div>

        </div>

      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">

              <AlertCircle
                size={20}
              />

            </div>

            <div className="min-w-0 flex-1">

              <p className="font-bold">
                Timetable error
              </p>

              <p className="mt-1 text-sm leading-6">
                {error}
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                loadTimetable(
                  true
                )
              }
              className="shrink-0 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-bold text-red-700 hover:bg-red-200"
            >
              Retry
            </button>

          </div>
        )}

        {/* ====================================================
            HERO
        ==================================================== */}

        <section className="relative overflow-hidden rounded-3xl bg-indigo-600 p-6 text-white shadow-lg sm:p-8">

          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/10" />

          <div className="absolute -bottom-20 right-32 h-52 w-52 rounded-full bg-white/5" />

          <div className="relative flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">

            <div className="max-w-3xl">

              <div className="mb-3 flex flex-wrap gap-2">

                <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                  Weekly Schedule
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">
                  {currentTime.toLocaleTimeString(
                    [],
                    {
                      hour:
                        "2-digit",
                      minute:
                        "2-digit",
                    }
                  )}
                </span>

              </div>

              <h2 className="text-2xl font-bold sm:text-3xl">
                {liveClass
                  ? "You are currently teaching"
                  : nextClass
                    ? "Your next class is coming up"
                    : "Your teaching schedule"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-indigo-100 sm:text-base">

                {liveClass ? (
                  <>
                    <span className="font-bold text-white">
                      {getCourseCode(
                        liveClass
                      )}
                    </span>{" "}
                    ·{" "}
                    {getCourseName(
                      liveClass
                    )}{" "}
                    in{" "}
                    {getRoom(
                      liveClass
                    )}
                    .
                  </>
                ) : nextClass ? (
                  <>
                    <span className="font-bold text-white">
                      {getCourseCode(
                        nextClass
                      )}
                    </span>{" "}
                    ·{" "}
                    {getCourseName(
                      nextClass
                    )}{" "}
                    starts in{" "}
                    <span className="font-bold text-white">
                      {
                        minutesUntilNext
                      }{" "}
                      min
                    </span>
                    .
                  </>
                ) : (
                  <>
                    You have{" "}
                    <span className="font-bold text-white">
                      {filteredTimetable.length}
                    </span>{" "}
                    scheduled session
                    {filteredTimetable.length ===
                    1
                      ? ""
                      : "s"}{" "}
                    in the current view.
                  </>
                )}

              </p>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              <HeroMetric
                label="Classes"
                value={
                  filteredTimetable.length
                }
              />

              <HeroMetric
                label="Hours"
                value={`${totalHours.toFixed(
                  1
                )}h`}
              />

              <HeroMetric
                label="Courses"
                value={
                  uniqueCourses
                }
              />

              <HeroMetric
                label="Rooms"
                value={
                  uniqueRooms
                }
              />

            </div>

          </div>

        </section>

        {/* ====================================================
            LIVE / NEXT CLASS
        ==================================================== */}

        {(liveClass ||
          nextClass) && (
          <section className="mt-6 grid gap-4 lg:grid-cols-2">

            {liveClass && (
              <LiveClassCard
                entry={
                  liveClass
                }
              />
            )}

            {nextClass && (
              <NextClassCard
                entry={
                  nextClass
                }
                minutesUntil={
                  minutesUntilNext
                }
              />
            )}

          </section>
        )}

        {/* ====================================================
            SUMMARY
        ==================================================== */}

        {!loading && (
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <SummaryCard
              icon={
                <CalendarDays
                  size={21}
                />
              }
              title="Weekly Classes"
              value={
                filteredTimetable.length
              }
              description="Scheduled sessions"
            />

            <SummaryCard
              icon={
                <Clock3 size={21} />
              }
              title="Teaching Hours"
              value={`${totalHours.toFixed(
                1
              )}h`}
              description={`${Math.floor(
                totalMinutes / 60
              )}h ${totalMinutes % 60}m total`}
              type="blue"
            />

            <SummaryCard
              icon={
                <BookOpen
                  size={21}
                />
              }
              title="Courses"
              value={
                uniqueCourses
              }
              description="Courses on schedule"
              type="purple"
            />

            <SummaryCard
              icon={
                <Award size={21} />
              }
              title="Busiest Day"
              value={
                busiestDay?.count ||
                0
              }
              description={
                busiestDay
                  ? busiestDay.label
                  : "No sessions"
              }
              type="amber"
            />

          </section>
        )}

        {/* ====================================================
            FILTERS
        ==================================================== */}

        {!loading && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Filter size={20} />
              </div>

              <div>

                <h2 className="font-bold text-slate-800">
                  Schedule Filters
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Narrow your timetable by batch, class type or search.
                </p>

              </div>

            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">

              <div className="relative lg:col-span-2">

                <label className="mb-2 block text-xs font-bold text-slate-500">
                  Search
                </label>

                <Search
                  size={17}
                  className="absolute left-3 top-[42px] text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder="Course, room, batch, semester..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch("")
                    }
                    className="absolute right-3 top-[42px] rounded-lg p-1 text-slate-400 hover:bg-slate-200"
                  >
                    <X
                      size={15}
                    />
                  </button>
                )}

              </div>

              <FilterSelect
                label="Batch"
                value={
                  batchFilter
                }
                onChange={
                  setBatchFilter
                }
                options={
                  BATCH_OPTIONS
                }
              />

              <FilterSelect
                label="Class Type"
                value={
                  typeFilter
                }
                onChange={
                  setTypeFilter
                }
                options={
                  TYPE_OPTIONS
                }
              />

              <FilterSelect
                label="Sort By"
                value={
                  sortBy
                }
                onChange={
                  setSortBy
                }
                options={[
                  {
                    value:
                      "time",
                    label:
                      "Start Time",
                  },
                  {
                    value:
                      "course",
                    label:
                      "Course",
                  },
                  {
                    value:
                      "room",
                    label:
                      "Room",
                  },
                  {
                    value:
                      "duration",
                    label:
                      "Duration",
                  },
                ]}
              />

            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">

                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 font-semibold">

                  <SlidersHorizontal
                    size={13}
                  />

                  {filteredTimetable.length}{" "}
                  of{" "}
                  {timetable.length}{" "}
                  sessions

                </span>

                {hasFilters && (
                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 font-bold text-indigo-600 hover:bg-indigo-100"
                  >

                    <X size={13} />

                    Clear Filters

                  </button>
                )}

              </div>

              <div className="flex items-center gap-2">

                <span className="hidden text-xs font-semibold text-slate-400 sm:inline">
                  View
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setViewMode(
                      "grid"
                    )
                  }
                  className={`rounded-lg p-2 ${
                    viewMode ===
                    "grid"
                      ? "bg-indigo-100 text-indigo-600"
                      : "text-slate-400 hover:bg-slate-100"
                  }`}
                  title="Card view"
                >
                  <LayoutGrid
                    size={17}
                  />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setViewMode(
                      "list"
                    )
                  }
                  className={`rounded-lg p-2 ${
                    viewMode ===
                    "list"
                      ? "bg-indigo-100 text-indigo-600"
                      : "text-slate-400 hover:bg-slate-100"
                  }`}
                  title="List view"
                >
                  <List
                    size={17}
                  />
                </button>

              </div>

            </div>

          </section>
        )}

        {/* ====================================================
            DAY SELECTOR
        ==================================================== */}

        {!loading && (
          <section className="mt-8">

            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

              <div>

                <h2 className="text-xl font-bold text-slate-900">
                  Weekly Schedule
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Select a day to view its classes.
                </p>

              </div>

              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600">

                <CalendarDays
                  size={14}
                />

                Today:{" "}
                {getDayName(
                  getTodayId()
                )}

              </span>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">

              {dayStats.map(
                (day) => {

                  const active =
                    Number(
                      selectedDay
                    ) ===
                    Number(
                      day.id
                    );

                  const today =
                    getTodayId() ===
                    day.id;

                  const width =
                    Math.round(
                      (day.hours /
                        maxDayHours) *
                        100
                    );

                  return (
                    <button
                      type="button"
                      key={
                        day.id
                      }
                      onClick={() =>
                        setSelectedDay(
                          day.id
                        )
                      }
                      className={`relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-md"
                          : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
                      }`}
                    >

                      {today && (
                        <span
                          className={`absolute right-3 top-3 h-2 w-2 rounded-full ${
                            active
                              ? "bg-white"
                              : "bg-indigo-500"
                          }`}
                        />
                      )}

                      <p
                        className={`text-xs font-bold uppercase tracking-wide ${
                          active
                            ? "text-indigo-100"
                            : "text-slate-400"
                        }`}
                      >
                        {day.short}
                      </p>

                      <p className="mt-2 text-sm font-bold">
                        {day.label}
                      </p>

                      <p
                        className={`mt-1 text-xs ${
                          active
                            ? "text-indigo-100"
                            : "text-slate-500"
                        }`}
                      >
                        {day.count} class
                        {day.count !==
                        1
                          ? "es"
                          : ""}
                      </p>

                      <div
                        className={`mt-3 h-1.5 overflow-hidden rounded-full ${
                          active
                            ? "bg-white/20"
                            : "bg-slate-100"
                        }`}
                      >

                        <div
                          className={`h-full rounded-full ${
                            active
                              ? "bg-white"
                              : "bg-indigo-500"
                          }`}
                          style={{
                            width: `${width}%`,
                          }}
                        />

                      </div>

                      <p
                        className={`mt-2 text-[10px] font-semibold ${
                          active
                            ? "text-indigo-100"
                            : "text-slate-400"
                        }`}
                      >
                        {day.hours.toFixed(
                          1
                        )}
                        h teaching
                      </p>

                    </button>
                  );
                }
              )}

            </div>

          </section>
        )}

        {/* ====================================================
            SELECTED DAY CLASSES
        ==================================================== */}

        {loading ? (
          <section className="mt-8 grid gap-5 lg:grid-cols-2">

            {[
              1,
              2,
              3,
              4,
            ].map(
              (item) => (
                <TimetableSkeleton
                  key={item}
                />
              )
            )}

          </section>
        ) : selectedDayEntries.length ===
          0 ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

              <CalendarDays
                size={30}
              />

            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-800">
              No classes scheduled
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">

              There are no matching classes on{" "}

              <span className="font-semibold text-slate-700">
                {getDayName(
                  selectedDay
                )}
              </span>

              {hasFilters
                ? " with the current filters."
                : "."}

            </p>

            {hasFilters && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
              >

                <X size={16} />

                Clear Filters

              </button>
            )}

          </section>
        ) : (
          <section className="mt-8">

            <div className="mb-4 flex items-end justify-between gap-4">

              <div>

                <h2 className="text-xl font-bold">
                  {getDayName(
                    selectedDay
                  )} Classes
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedDayEntries.length} session
                  {selectedDayEntries.length !==
                  1
                    ? "s"
                    : ""}{" "}
                  scheduled.
                </p>

              </div>

              <div className="hidden rounded-xl bg-white px-4 py-2 text-right shadow-sm ring-1 ring-slate-200 sm:block">

                <p className="text-xs font-semibold text-slate-400">
                  Day Hours
                </p>

                <p className="text-lg font-bold text-slate-800">

                  {(
                    selectedDayEntries.reduce(
                      (total, entry) =>
                        total +
                        getDurationMinutes(
                          entry
                        ),
                      0
                    ) /
                    60
                  ).toFixed(
                    1
                  )}h

                </p>

              </div>

            </div>

            {viewMode ===
            "grid" ? (
              <div className="grid gap-5 lg:grid-cols-2">

                {selectedDayEntries.map(
                  (entry) => (
                    <TimetableCard
                      key={
                        entry.id
                      }
                      entry={
                        entry
                      }
                      deleting={
                        deletingId ===
                        entry.id
                      }
                      onDelete={
                        handleDelete
                      }
                      onEdit={
                        openEditModal
                      }
                    />
                  )
                )}

              </div>
            ) : (
              <TimetableList
                entries={
                  selectedDayEntries
                }
                deletingId={
                  deletingId
                }
                onDelete={
                  handleDelete
                }
                onEdit={
                  openEditModal
                }
              />
            )}

          </section>
        )}

        {/* ====================================================
            ANALYTICS
        ==================================================== */}

        {!loading &&
          filteredTimetable.length >
            0 && (
            <section className="mt-8 grid gap-6 lg:grid-cols-2">

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

                    <Activity
                      size={21}
                    />

                  </div>

                  <div>

                    <h2 className="font-bold">
                      Weekly Workload
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Teaching hours by day
                    </p>

                  </div>

                </div>

                <div className="mt-6 space-y-4">

                  {dayStats.map(
                    (day) => {

                      const width =
                        Math.round(
                          (day.hours /
                            maxDayHours) *
                            100
                        );

                      return (
                        <div
                          key={
                            day.id
                          }
                        >

                          <div className="flex items-center justify-between gap-3">

                            <span className="text-sm font-semibold text-slate-700">
                              {
                                day.label
                              }
                            </span>

                            <span className="text-xs font-bold text-slate-500">
                              {day.hours.toFixed(
                                1
                              )}
                              h ·{" "}
                              {
                                day.count
                              }{" "}
                              class
                              {day.count !==
                              1
                                ? "es"
                                : ""}
                            </span>

                          </div>

                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">

                            <div
                              className="h-full rounded-full bg-indigo-600"
                              style={{
                                width: `${width}%`,
                              }}
                            />

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">

                    <BookOpen
                      size={21}
                    />

                  </div>

                  <div>

                    <h2 className="font-bold">
                      Session Breakdown
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Lecture and practical workload
                    </p>

                  </div>

                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">

                  <BreakdownCard
                    label="Lectures"
                    value={
                      lectureClasses
                    }
                    percentage={
                      filteredTimetable.length
                        ? Math.round(
                            (lectureClasses /
                              filteredTimetable.length) *
                              100
                          )
                        : 0
                    }
                    icon={
                      <GraduationCap
                        size={19}
                      />
                    }
                    type="blue"
                  />

                  <BreakdownCard
                    label="Practicals"
                    value={
                      practicalClasses
                    }
                    percentage={
                      filteredTimetable.length
                        ? Math.round(
                            (practicalClasses /
                              filteredTimetable.length) *
                              100
                          )
                        : 0
                    }
                    icon={
                      <Layers3
                        size={19}
                      />
                    }
                    type="purple"
                  />

                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">

                  <div className="flex items-center justify-between gap-3">

                    <span className="text-sm font-semibold text-slate-600">
                      Scheduled hours
                    </span>

                    <span className="text-sm font-bold text-slate-800">
                      {totalHours.toFixed(
                        1
                      )}
                      h
                    </span>

                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">

                    <div className="rounded-xl bg-white p-3">

                      <p className="text-slate-400">
                        Courses
                      </p>

                      <p className="mt-1 font-bold text-slate-800">
                        {
                          uniqueCourses
                        }
                      </p>

                    </div>

                    <div className="rounded-xl bg-white p-3">

                      <p className="text-slate-400">
                        Batches
                      </p>

                      <p className="mt-1 font-bold text-slate-800">
                        {
                          uniqueBatches
                        }
                      </p>

                    </div>

                  </div>

                </div>

              </div>

            </section>
          )}

        {/* ====================================================
            FACULTY PROFILE
        ==================================================== */}

        {!loading && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-4">

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">

                  <GraduationCap
                    size={28}
                  />

                </div>

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Faculty Schedule
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-slate-800">
                    {
                      getFacultyName(
                        faculty
                      )
                    }
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {faculty?.employeeId ||
                      faculty?.facultyId ||
                      "Teaching Faculty"}
                  </p>

                </div>

              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                <MiniStat
                  label="Classes"
                  value={
                    filteredTimetable.length
                  }
                />

                <MiniStat
                  label="Hours"
                  value={`${totalHours.toFixed(
                    1
                  )}h`}
                />

                <MiniStat
                  label="Courses"
                  value={
                    uniqueCourses
                  }
                />

                <MiniStat
                  label="Rooms"
                  value={
                    uniqueRooms
                  }
                />

              </div>

            </div>

          </section>
        )}

      </main>

      {/* ======================================================
          EDIT MODAL
      ====================================================== */}

      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">

                  <Pencil
                    size={20}
                  />

                </div>

                <div>

                  <h2 className="text-lg font-bold text-slate-800">
                    Edit Timetable
                  </h2>

                  <p className="text-xs text-slate-500">
                    {getCourseCode(
                      editingEntry
                    )}{" "}
                    ·{" "}
                    {getCourseName(
                      editingEntry
                    )}
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={
                  closeEditModal
                }
                disabled={
                  savingEdit
                }
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              >

                <X
                  size={20}
                />

              </button>

            </div>

            {/* MODAL FORM */}

            <form
              onSubmit={
                handleUpdate
              }
              className="space-y-5 p-5 sm:p-6"
            >

              <div className="grid gap-4 sm:grid-cols-2">

                {/* DAY */}

                <div>

                  <label className="mb-2 block text-xs font-bold text-slate-500">
                    Day
                  </label>

                  <div className="relative">

                    <select
                      name="dayOfWeek"
                      value={
                        editForm.dayOfWeek
                      }
                      onChange={
                        handleEditChange
                      }
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    >

                      {DAYS.map(
                        (day) => (
                          <option
                            key={
                              day.id
                            }
                            value={
                              day.id
                            }
                          >
                            {
                              day.label
                            }
                          </option>
                        )
                      )}

                    </select>

                    <ChevronDown
                      size={17}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                  </div>

                </div>

                {/* BATCH */}

                <div>

                  <label className="mb-2 block text-xs font-bold text-slate-500">
                    Batch
                  </label>

                  <div className="relative">

                    <select
                      name="batch"
                      value={
                        editForm.batch
                      }
                      onChange={
                        handleEditChange
                      }
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    >

                      <option value="">
                        Common / All Batches
                      </option>

                      <option value="1">
                        Batch 1
                      </option>

                      <option value="2">
                        Batch 2
                      </option>

                      <option value="3">
                        Batch 3
                      </option>

                    </select>

                    <ChevronDown
                      size={17}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                  </div>

                </div>

                {/* START TIME */}

                <div>

                  <label className="mb-2 block text-xs font-bold text-slate-500">
                    Start Time
                  </label>

                  <input
                    type="time"
                    name="startTime"
                    value={
                      editForm.startTime
                    }
                    onChange={
                      handleEditChange
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />

                </div>

                {/* END TIME */}

                <div>

                  <label className="mb-2 block text-xs font-bold text-slate-500">
                    End Time
                  </label>

                  <input
                    type="time"
                    name="endTime"
                    value={
                      editForm.endTime
                    }
                    onChange={
                      handleEditChange
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />

                </div>

                {/* ROOM */}

                <div>

                  <label className="mb-2 block text-xs font-bold text-slate-500">
                    Room
                  </label>

                  <input
                    type="text"
                    name="room"
                    value={
                      editForm.room
                    }
                    onChange={
                      handleEditChange
                    }
                    placeholder="e.g. Lab 204"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />

                </div>

                {/* CLASS TYPE */}

                <div>

                  <label className="mb-2 block text-xs font-bold text-slate-500">
                    Class Type
                  </label>

                  <div className="relative">

                    <select
                      name="classType"
                      value={
                        editForm.classType
                      }
                      onChange={
                        handleEditChange
                      }
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    >

                      <option value="Lecture">
                        Lecture
                      </option>

                      <option value="Practical">
                        Practical
                      </option>

                    </select>

                    <ChevronDown
                      size={17}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                  </div>

                </div>

              </div>

              {/* COURSE INFORMATION */}

              <div className="rounded-xl bg-slate-50 p-4">

                <p className="text-xs font-bold text-slate-500">
                  Course
                </p>

                <p className="mt-1 font-bold text-slate-800">
                  {getCourseCode(
                    editingEntry
                  )}{" "}
                  ·{" "}
                  {getCourseName(
                    editingEntry
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Course assignment is not changed while editing the timetable slot.
                </p>

              </div>

              {/* MODAL ACTIONS */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    closeEditModal
                  }
                  disabled={
                    savingEdit
                  }
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    savingEdit
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {savingEdit ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />

                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2
                        size={16}
                      />

                      Save Changes
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

/* ============================================================
   HERO METRIC
============================================================ */

function HeroMetric({
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center backdrop-blur">

      <p className="text-xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-[10px] font-semibold text-indigo-200">
        {label}
      </p>

    </div>
  );
}

/* ============================================================
   LIVE CLASS CARD
============================================================ */

function LiveClassCard({
  entry,
}) {
  return (
    <div className="rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm">

      <div className="flex items-start gap-4">

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">

          <CheckCircle2
            size={22}
          />

        </div>

        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-2">

            <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-green-700">
              Live Now
            </span>

            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500">
              {
                getClassType(
                  entry
                )
              }
            </span>

          </div>

          <h3 className="mt-2 text-lg font-bold text-slate-800">

            {
              getCourseCode(
                entry
              )
            }{" "}
            ·{" "}
            {
              getCourseName(
                entry
              )
            }

          </h3>

          <div className="mt-2 flex flex-wrap gap-4 text-xs font-medium text-slate-500">

            <span className="inline-flex items-center gap-1.5">

              <Clock3
                size={14}
              />

              {formatTime(
                entry?.startTime
              )}{" "}
              -{" "}
              {formatTime(
                entry?.endTime
              )}

            </span>

            <span className="inline-flex items-center gap-1.5">

              <MapPin
                size={14}
              />

              {
                getRoom(
                  entry
                )
              }

            </span>

          </div>

        </div>

      </div>

    </div>
  );
}

/* ============================================================
   NEXT CLASS CARD
============================================================ */

function NextClassCard({
  entry,
  minutesUntil,
}) {
  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">

      <div className="flex items-start gap-4">

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">

          <Clock3
            size={22}
          />

        </div>

        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-2">

            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
              Next Class
            </span>

            {minutesUntil !==
              null && (
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-600">
                {minutesUntil}{" "}
                min
              </span>
            )}

          </div>

          <h3 className="mt-2 text-lg font-bold text-slate-800">

            {
              getCourseCode(
                entry
              )
            }{" "}
            ·{" "}
            {
              getCourseName(
                entry
              )
            }

          </h3>

          <div className="mt-2 flex flex-wrap gap-4 text-xs font-medium text-slate-500">

            <span className="inline-flex items-center gap-1.5">

              <Clock3
                size={14}
              />

              {
                formatTime(
                  entry?.startTime
                )
              }{" "}
              -{" "}
              {
                formatTime(
                  entry?.endTime
                )
              }

            </span>

            <span className="inline-flex items-center gap-1.5">

              <MapPin
                size={14}
              />

              {
                getRoom(
                  entry
                )
              }

            </span>

          </div>

        </div>

      </div>

    </div>
  );
}

/* ============================================================
   SUMMARY CARD
============================================================ */

function SummaryCard({
  icon,
  title,
  value,
  description,
  type = "default",
}) {
  const styles = {
    default:
      "bg-indigo-50 text-indigo-600",

    blue:
      "bg-blue-50 text-blue-600",

    purple:
      "bg-purple-50 text-purple-600",

    amber:
      "bg-amber-50 text-amber-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
          styles[type]
        }`}
      >
        {icon}
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-3xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>

    </div>
  );
}

/* ============================================================
   FILTER SELECT
============================================================ */

function FilterSelect({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <div>

      <label className="mb-2 block text-xs font-bold text-slate-500">
        {label}
      </label>

      <div className="relative">

        <select
          value={value}
          onChange={(event) =>
            onChange(
              event.target
                .value
            )
          }
          className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        >

          {options.map(
            (option) => (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {option.label}
              </option>
            )
          )}

        </select>

        <ChevronDown
          size={17}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

      </div>

    </div>
  );
}

/* ============================================================
   TIMETABLE CARD
============================================================ */

function TimetableCard({
  entry,
  deleting,
  onDelete,
  onEdit,
}) {
  const status =
    getEntryStatus(
      entry
    );

  const statusConfig = {
    live: {
      label: "Live Now",
      className:
        "bg-green-100 text-green-700",
      dotClass:
        "bg-green-500",
    },

    upcoming: {
      label: "Upcoming",
      className:
        "bg-blue-50 text-blue-700",
      dotClass:
        "bg-blue-500",
    },

    completed: {
      label: "Completed",
      className:
        "bg-slate-100 text-slate-500",
      dotClass:
        "bg-slate-400",
    },
  };

  const statusItem =
    statusConfig[
      status
    ] || statusConfig.upcoming;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg">

      <div
        className={`h-1 ${
          status === "live"
            ? "bg-green-500"
            : status ===
                "completed"
              ? "bg-slate-300"
              : "bg-indigo-500"
        }`}
      />

      <div className="p-5">

        <div className="flex items-start justify-between gap-4">

          <div className="flex min-w-0 items-start gap-3">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

              <BookOpen
                size={22}
              />

            </div>

            <div className="min-w-0">

              <p className="text-xs font-bold text-indigo-600">
                {
                  getCourseCode(
                    entry
                  )
                }
              </p>

              <h3 className="mt-1 truncate text-lg font-bold text-slate-800">
                {
                  getCourseName(
                    entry
                  )
                }
              </h3>

            </div>

          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold ${statusItem.className}`}
          >

            <span
              className={`h-1.5 w-1.5 rounded-full ${statusItem.dotClass}`}
            />

            {statusItem.label}

          </span>

        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">

          <div className="flex items-center gap-3">

            <Clock3
              size={18}
              className="text-indigo-600"
            />

            <div>

              <p className="text-xs font-medium text-slate-400">
                Teaching Time
              </p>

              <p className="mt-1 text-base font-bold text-slate-800">

                {
                  formatTime(
                    entry?.startTime
                  )
                }{" "}
                -{" "}
                {
                  formatTime(
                    entry?.endTime
                  )
                }

              </p>

            </div>

          </div>

        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">

          <InfoBox
            icon={
              <MapPin
                size={16}
              />
            }
            label="Room"
            value={
              getRoom(
                entry
              )
            }
          />

          <InfoBox
            icon={
              <Layers3
                size={16}
              />
            }
            label="Batch"
            value={
              getBatchLabel(
                entry?.batch
              )
            }
          />

          <InfoBox
            icon={
              <GraduationCap
                size={16}
              />
            }
            label="Semester"
            value={
              getSemester(
                entry
              )
            }
          />

          <InfoBox
            icon={
              <Users
                size={16}
              />
            }
            label="Class Type"
            value={
              getClassType(
                entry
              )
            }
          />

        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">

          <span className="text-xs font-medium text-slate-400">

            Duration:{" "}

            <span className="font-bold text-slate-600">
              {formatDuration(
                getDurationMinutes(
                  entry
                )
              )}
            </span>

          </span>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() =>
                onEdit(entry)
              }
              disabled={
                deleting
              }
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
            >

              <Pencil
                size={15}
              />

              Edit

            </button>

            <button
              type="button"
              onClick={() =>
                onDelete(
                  entry.id
                )
              }
              disabled={
                deleting
              }
              className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >

              {deleting ? (
                <RefreshCw
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <Trash2
                  size={15}
                />
              )}

              {deleting
                ? "Deleting..."
                : "Delete"}

            </button>

          </div>

        </div>

      </div>

    </article>
  );
}

/* ============================================================
   TIMETABLE LIST
============================================================ */

function TimetableList({
  entries,
  deletingId,
  onDelete,
  onEdit,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-400 lg:grid">

        <span>
          Course
        </span>

        <span>
          Time
        </span>

        <span>
          Room
        </span>

        <span>
          Batch
        </span>

        <span>
          Type
        </span>

        <span>
          Action
        </span>

      </div>

      <div className="divide-y divide-slate-100">

        {entries.map(
          (entry) => (

            <div
              key={
                entry.id
              }
              className="grid gap-4 px-5 py-5 transition hover:bg-slate-50 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] lg:items-center"
            >

              <div className="min-w-0">

                <p className="truncate font-bold text-slate-800">
                  {
                    getCourseName(
                      entry
                    )
                  }
                </p>

                <p className="mt-1 text-xs font-bold text-indigo-600">
                  {
                    getCourseCode(
                      entry
                    )
                  }
                </p>

              </div>

              <div>

                <p className="text-xs text-slate-400 lg:hidden">
                  Time
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700 lg:mt-0">

                  {
                    formatTime(
                      entry?.startTime
                    )
                  }{" "}
                  -{" "}
                  {
                    formatTime(
                      entry?.endTime
                    )
                  }

                </p>

              </div>

              <div>

                <p className="text-xs text-slate-400 lg:hidden">
                  Room
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700 lg:mt-0">
                  {
                    getRoom(
                      entry
                    )
                  }
                </p>

              </div>

              <div>

                <p className="text-xs text-slate-400 lg:hidden">
                  Batch
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700 lg:mt-0">
                  {
                    getBatchLabel(
                      entry?.batch
                    )
                  }
                </p>

              </div>

              <div>

                <p className="text-xs text-slate-400 lg:hidden">
                  Type
                </p>

                <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 lg:mt-0">
                  {
                    getClassType(
                      entry
                    )
                  }
                </span>

              </div>

              <div className="flex items-center gap-2">

                <button
                  type="button"
                  onClick={() =>
                    onEdit(entry)
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                >

                  <Pencil
                    size={14}
                  />

                  Edit

                </button>

                <button
                  type="button"
                  onClick={() =>
                    onDelete(
                      entry.id
                    )
                  }
                  disabled={
                    deletingId ===
                    entry.id
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >

                  {deletingId ===
                  entry.id ? (
                    <RefreshCw
                      size={14}
                      className="animate-spin"
                    />
                  ) : (
                    <Trash2
                      size={14}
                    />
                  )}

                  Delete

                </button>

              </div>

            </div>

          )
        )}

      </div>

    </div>
  );
}

/* ============================================================
   INFO BOX
============================================================ */

function InfoBox({
  icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">

      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">

        <span className="text-indigo-600">
          {icon}
        </span>

        {label}

      </div>

      <p className="mt-1 text-sm font-semibold text-slate-700">
        {value}
      </p>

    </div>
  );
}

/* ============================================================
   BREAKDOWN CARD
============================================================ */

function BreakdownCard({
  label,
  value,
  percentage,
  icon,
  type,
}) {
  const styles = {
    blue: {
      box:
        "bg-blue-50 text-blue-600",
      bar:
        "bg-blue-500",
    },

    purple: {
      box:
        "bg-purple-50 text-purple-600",
      bar:
        "bg-purple-500",
    },
  };

  const selected =
    styles[type] ||
    styles.blue;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

      <div className="flex items-center gap-3">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${selected.box}`}
        >
          {icon}
        </div>

        <div>

          <p className="text-xs font-semibold text-slate-400">
            {label}
          </p>

          <p className="text-xl font-bold text-slate-800">
            {value}
          </p>

        </div>

      </div>

      <div className="mt-4">

        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">

          <span>
            Share
          </span>

          <span>
            {
              percentage
            }
            %
          </span>

        </div>

        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white">

          <div
            className={`h-full rounded-full ${selected.bar}`}
            style={{
              width: `${percentage}%`,
            }}
          />

        </div>

      </div>

    </div>
  );
}

/* ============================================================
   MINI STAT
============================================================ */

function MiniStat({
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">

      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-800">
        {value}
      </p>

    </div>
  );
}

/* ============================================================
   TIMETABLE SKELETON
============================================================ */

function TimetableSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="h-1 bg-slate-200" />

      <div className="space-y-5 p-5">

        <div className="flex items-start gap-3">

          <div className="h-12 w-12 rounded-xl bg-slate-200" />

          <div className="flex-1">

            <div className="h-3 w-20 rounded bg-slate-200" />

            <div className="mt-2 h-5 w-3/4 rounded bg-slate-200" />

          </div>

        </div>

        <div className="h-20 rounded-2xl bg-slate-100" />

        <div className="grid grid-cols-2 gap-3">

          <div className="h-16 rounded-xl bg-slate-100" />

          <div className="h-16 rounded-xl bg-slate-100" />

          <div className="h-16 rounded-xl bg-slate-100" />

          <div className="h-16 rounded-xl bg-slate-100" />

        </div>

        <div className="h-9 rounded-xl bg-slate-100" />

      </div>

    </div>
  );
}

/* ============================================================
   DURATION FORMAT
============================================================ */

function formatDuration(
  minutes
) {
  if (!minutes || minutes <= 0) {
    return "—";
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  const remainingMinutes =
    minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (
    remainingMinutes === 0
  ) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

export default FacultyTimetable;