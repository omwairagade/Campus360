import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  Activity,
  AlertCircle,
  ArrowRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleDot,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileText,
  GraduationCap,
  LayoutGrid,
  ListChecks,
  LogOut,
  MapPin,
  Megaphone,
  RefreshCw,
  ShieldAlert,
  Target,
  Timer,
  TrendingUp,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";

import {
  apiGet,
  logoutUser,
} from "../api";

/* ============================================================
   CONSTANTS
============================================================ */

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DAY_ITEMS = [
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

/* ============================================================
   RESPONSE NORMALIZERS
============================================================ */

const normalizeArray = (
  response,
  keys = []
) => {
  if (Array.isArray(response)) {
    return response;
  }

  for (const key of keys) {
    if (
      Array.isArray(
        response?.[key]
      )
    ) {
      return response[key];
    }
  }

  if (
    Array.isArray(
      response?.data
    )
  ) {
    return response.data;
  }

  for (const key of keys) {
    if (
      Array.isArray(
        response?.data?.[key]
      )
    ) {
      return response.data[key];
    }
  }

  return [];
};

const normalizeFaculty = (
  response
) => {
  if (!response) {
    return null;
  }

  return (
    response?.faculty ||
    response?.data?.faculty ||
    response?.data ||
    null
  );
};

/* ============================================================
   TIME HELPERS
============================================================ */

const parseTimeToMinutes = (
  value
) => {
  if (!value) {
    return null;
  }

  const text =
    String(value).trim();

  const match =
    text.match(
      /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
    );

  if (!match) {
    return null;
  }

  const hour =
    Number(match[1]);

  const minute =
    Number(match[2]);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
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
};

const calculateDurationMinutes = (
  startTime,
  endTime
) => {
  const start =
    parseTimeToMinutes(
      startTime
    );

  const end =
    parseTimeToMinutes(
      endTime
    );

  if (
    start === null ||
    end === null ||
    end <= start
  ) {
    return 0;
  }

  return end - start;
};

const calculateDurationHours = (
  startTime,
  endTime
) =>
  calculateDurationMinutes(
    startTime,
    endTime
  ) / 60;

const formatTime = (
  value
) => {
  if (!value) {
    return "—";
  }

  const text =
    String(value);

  const match =
    text.match(
      /^(\d{1,2}):(\d{2})/
    );

  if (!match) {
    return text;
  }

  const hour =
    Number(match[1]);

  const minute =
    match[2];

  const suffix =
    hour >= 12
      ? "PM"
      : "AM";

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
};

const formatDate = (
  value
) => {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
};

const formatDateTime = (
  value
) => {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
};

const getDaysUntil = (
  value
) => {
  if (!value) {
    return null;
  }

  const target =
    new Date(value);

  if (
    Number.isNaN(
      target.getTime()
    )
  ) {
    return null;
  }

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const targetDay =
    new Date(target);

  targetDay.setHours(
    0,
    0,
    0,
    0
  );

  return Math.ceil(
    (
      targetDay.getTime() -
      today.getTime()
    ) /
      (
        1000 *
        60 *
        60 *
        24
      )
  );
};

const getUrgencyText = (
  value
) => {
  const days =
    getDaysUntil(value);

  if (days === null) {
    return "Date unavailable";
  }

  if (days < 0) {
    return "Overdue";
  }

  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "Tomorrow";
  }

  return `In ${days} days`;
};

const getClassState = (
  entry
) => {
  const start =
    parseTimeToMinutes(
      entry?.startTime
    );

  const end =
    parseTimeToMinutes(
      entry?.endTime
    );

  if (
    start === null ||
    end === null
  ) {
    return "scheduled";
  }

  const now =
    new Date();

  const current =
    now.getHours() * 60 +
    now.getMinutes();

  if (
    current >= start &&
    current < end
  ) {
    return "current";
  }

  if (
    current < start
  ) {
    return "upcoming";
  }

  return "completed";
};

const getMinutesUntilTodayTime = (
  time
) => {
  const target =
    parseTimeToMinutes(
      time
    );

  if (target === null) {
    return null;
  }

  const now =
    new Date();

  return (
    target -
    (
      now.getHours() * 60 +
      now.getMinutes()
    )
  );
};

/* ============================================================
   GENERIC HELPERS
============================================================ */

const getCourseName = (
  item
) =>
  item?.course?.name ||
  item?.course?.title ||
  item?.courseName ||
  "Course";

const getCourseCode = (
  item
) =>
  item?.course?.code ||
  item?.course?.courseCode ||
  item?.courseCode ||
  "COURSE";

const getFacultyName = (
  user
) => {
  const fullName =
    `${user?.firstName || ""} ${
      user?.lastName || ""
    }`.trim();

  return (
    fullName ||
    user?.name ||
    user?.fullName ||
    user?.faculty?.name ||
    "Faculty Member"
  );
};

const getRoom = (
  item
) =>
  item?.room ||
  item?.roomNumber ||
  "Room not assigned";

const getInitials = (
  name
) => {
  const words =
    String(name)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    words.length === 0
  ) {
    return "F";
  }

  if (
    words.length === 1
  ) {
    return words[0]
      .charAt(0)
      .toUpperCase();
  }

  return `${words[0].charAt(
    0
  )}${words[
    words.length - 1
  ].charAt(
    0
  )}`.toUpperCase();
};

const getSubmissionCount = (
  assignment
) =>
  Number(
    assignment?.totalSubmissions ||
      assignment?.submissionsCount ||
      assignment?.submissionCount ||
      0
  );

const getPendingGrading = (
  assignment
) =>
  Number(
    assignment?.pendingGrading ||
      assignment?.pendingCount ||
      0
  );

const getResultCount = (
  exam
) =>
  Number(
    exam?.totalResults ||
      exam?.resultsCount ||
      exam?.resultCount ||
      exam?.results?.length ||
      0
  );

/* ============================================================
   COMPONENT
============================================================ */

function FacultyDashboard() {
  const navigate =
    useNavigate();

  const [
    user,
    setUser,
  ] = useState({});

  const [
    courses,
    setCourses,
  ] = useState([]);

  const [
    students,
    setStudents,
  ] = useState([]);

  const [
    assignments,
    setAssignments,
  ] = useState([]);

  const [
    exams,
    setExams,
  ] = useState([]);

  const [
    timetable,
    setTimetable,
  ] = useState([]);

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
    currentTime,
    setCurrentTime,
  ] = useState(
    new Date()
  );

  const [
    lastUpdated,
    setLastUpdated,
  ] = useState(null);

  /* ==========================================================
     LIVE CLOCK
  ========================================================== */

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setCurrentTime(
            new Date()
          );
        },
        30000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, []);

  /* ==========================================================
     STORED USER
  ========================================================== */

  useEffect(() => {
    const storedUser =
      localStorage.getItem(
        "user"
      );

    if (!storedUser) {
      return;
    }

    try {
      setUser(
        JSON.parse(
          storedUser
        )
      );
    } catch (
      parseError
    ) {
      console.error(
        "Failed to parse stored user:",
        parseError
      );
    }
  }, []);

  /* ==========================================================
     LOAD DASHBOARD
  ========================================================== */

  const loadDashboard =
    useCallback(
      async ({
        isRefresh = false,
      } = {}) => {
        try {
          if (isRefresh) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError("");

          const requests = [
            {
              name:
                "courses",
              request:
                apiGet(
                  "/faculty/my-courses"
                ),
            },
            {
              name:
                "students",
              request:
                apiGet(
                  "/student/faculty/students"
                ),
            },
            {
              name:
                "assignments",
              request:
                apiGet(
                  "/assignments/faculty/my-assignments"
                ),
            },
            {
              name:
                "exams",
              request:
                apiGet(
                  "/exams/faculty/my-exams"
                ),
            },
            {
              name:
                "timetable",
              request:
                apiGet(
                  "/timetable/faculty/my-timetable"
                ),
            },
          ];

          const results =
            await Promise.allSettled(
              requests.map(
                (
                  item
                ) =>
                  item.request
              )
            );

          const failures =
            [];

          results.forEach(
            (
              result,
              index
            ) => {
              const service =
                requests[index]
                  .name;

              if (
                result.status ===
                "fulfilled"
              ) {
                const response =
                  result.value;

                if (
                  service ===
                  "courses"
                ) {
                  setCourses(
                    normalizeArray(
                      response,
                      [
                        "courses",
                      ]
                    )
                  );
                }

                if (
                  service ===
                  "students"
                ) {
                  const list =
                    normalizeArray(
                      response,
                      [
                        "students",
                      ]
                    );

                  setStudents(
                    list
                  );

                  const faculty =
                    normalizeFaculty(
                      response
                    );

                  if (faculty) {
                    setUser(
                      (
                        current
                      ) => ({
                        ...current,
                        ...(faculty.user ||
                          {}),
                        faculty,
                      })
                    );
                  }
                }

                if (
                  service ===
                  "assignments"
                ) {
                  setAssignments(
                    normalizeArray(
                      response,
                      [
                        "assignments",
                      ]
                    )
                  );
                }

                if (
                  service ===
                  "exams"
                ) {
                  setExams(
                    normalizeArray(
                      response,
                      [
                        "exams",
                      ]
                    )
                  );
                }

                if (
                  service ===
                  "timetable"
                ) {
                  setTimetable(
                    normalizeArray(
                      response,
                      [
                        "timetable",
                        "entries",
                      ]
                    )
                  );
                }
              } else {
                const message =
                  result.reason
                    ?.message ||
                  "Request failed.";

                failures.push({
                  service,
                  message,
                });

                console.error(
                  `Faculty dashboard ${service} error:`,
                  result.reason
                );
              }
            }
          );

          const authFailure =
            failures.find(
              (
                failure
              ) =>
                /token|authentication|unauthorized|forbidden/i.test(
                  failure.message
                )
            );

          if (
            authFailure
          ) {
            logoutUser();
            navigate("/");
            return;
          }

          if (
            failures.length >
            0
          ) {
            const names = {
              courses:
                "courses",
              students:
                "students",
              assignments:
                "assignments",
              exams:
                "examinations",
              timetable:
                "timetable",
            };

            const readableNames =
              failures.map(
                (
                  failure
                ) =>
                  names[
                    failure.service
                  ] ||
                  failure.service
              );

            setError(
              `Some dashboard sections could not be loaded: ${readableNames.join(
                ", "
              )}. Other sections are still available.`
            );
          }

          setLastUpdated(
            new Date()
          );
        } catch (
          loadError
        ) {
          console.error(
            "Faculty dashboard error:",
            loadError
          );

          const message =
            loadError?.message ||
            "Unable to load faculty dashboard.";

          if (
            /token|authentication|unauthorized|forbidden/i.test(
              message
            )
          ) {
            logoutUser();
            navigate("/");
            return;
          }

          setError(
            message
          );
        } finally {
          setLoading(
            false
          );
          setRefreshing(
            false
          );
        }
      },
      [navigate]
    );

  useEffect(() => {
    loadDashboard();
  }, [
    loadDashboard,
  ]);

  /* ==========================================================
     LOGOUT
  ========================================================== */

  const handleLogout =
    () => {
      logoutUser();
      navigate("/");
    };

  /* ==========================================================
     FACULTY INFO
  ========================================================== */

  const facultyName =
    getFacultyName(
      user
    );

  const role =
    user?.role ||
    "FACULTY";

  const facultyProfile =
    user?.faculty || {};

  const department =
    facultyProfile?.department;

  const designation =
    facultyProfile?.designation ||
    facultyProfile?.position ||
    "Faculty Member";

  /* ==========================================================
     DATE
  ========================================================== */

  const todayIndex =
    currentTime.getDay();

  const todayNumber =
    todayIndex === 0
      ? 7
      : todayIndex;

  const todayName =
    DAYS[todayIndex];

  const todayDate =
    currentTime.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );

  const greeting =
    currentTime.getHours() <
    12
      ? "Good morning"
      : currentTime.getHours() <
        17
      ? "Good afternoon"
      : "Good evening";

  /* ==========================================================
     TODAY CLASSES
  ========================================================== */

  const todayClasses =
    useMemo(() => {
      return timetable
        .filter(
          (entry) =>
            Number(
              entry?.dayOfWeek
            ) ===
            todayNumber
        )
        .sort(
          (
            a,
            b
          ) =>
            (
              parseTimeToMinutes(
                a?.startTime
              ) ??
              9999
            ) -
            (
              parseTimeToMinutes(
                b?.startTime
              ) ??
              9999
            )
        );
    }, [
      timetable,
      todayNumber,
    ]);

  /* ==========================================================
     CURRENT / NEXT CLASS
  ========================================================== */

  const currentClass =
    useMemo(() => {
      return (
        todayClasses.find(
          (
            entry
          ) =>
            getClassState(
              entry
            ) ===
            "current"
        ) ||
        null
      );
    }, [
      todayClasses,
      currentTime,
    ]);

  const nextClass =
    useMemo(() => {
      return (
        todayClasses.find(
          (
            entry
          ) =>
            getClassState(
              entry
            ) ===
            "upcoming"
        ) ||
        null
      );
    }, [
      todayClasses,
      currentTime,
    ]);

  const minutesToNextClass =
    nextClass
      ? getMinutesUntilTodayTime(
          nextClass.startTime
        )
      : null;

  /* ==========================================================
     WEEKLY TEACHING
  ========================================================== */

  const weeklyTeachingMinutes =
    timetable.reduce(
      (
        total,
        entry
      ) =>
        total +
        calculateDurationMinutes(
          entry?.startTime,
          entry?.endTime
        ),
      0
    );

  const weeklyTeachingHours =
    weeklyTeachingMinutes /
    60;

  const todayTeachingHours =
    todayClasses.reduce(
      (
        total,
        entry
      ) =>
        total +
        calculateDurationHours(
          entry?.startTime,
          entry?.endTime
        ),
      0
    );

  /* ==========================================================
     UPCOMING ASSIGNMENTS
  ========================================================== */

  const upcomingAssignments =
    useMemo(() => {
      const now =
        new Date();

      return assignments
        .filter(
          (
            assignment
          ) => {
            if (
              !assignment?.dueDate
            ) {
              return false;
            }

            const date =
              new Date(
                assignment.dueDate
              );

            return (
              !Number.isNaN(
                date.getTime()
              ) &&
              date >= now
            );
          }
        )
        .sort(
          (
            a,
            b
          ) =>
            new Date(
              a.dueDate
            ).getTime() -
            new Date(
              b.dueDate
            ).getTime()
        )
        .slice(
          0,
          4
        );
    }, [
      assignments,
    ]);

  /* ==========================================================
     UPCOMING EXAMS
  ========================================================== */

  const upcomingExams =
    useMemo(() => {
      const now =
        new Date();

      return exams
        .filter(
          (
            exam
          ) => {
            if (
              !exam?.examDate
            ) {
              return false;
            }

            const date =
              new Date(
                exam.examDate
              );

            return (
              !Number.isNaN(
                date.getTime()
              ) &&
              date >= now
            );
          }
        )
        .sort(
          (
            a,
            b
          ) =>
            new Date(
              a.examDate
            ).getTime() -
            new Date(
              b.examDate
            ).getTime()
        )
        .slice(
          0,
          4
        );
    }, [
      exams,
    ]);

  /* ==========================================================
     CORE METRICS
  ========================================================== */

  const totalCredits =
    courses.reduce(
      (
        total,
        course
      ) =>
        total +
        Number(
          course?.credits ||
            course?.credit ||
            0
        ),
      0
    );

  const totalSubmissions =
    assignments.reduce(
      (
        total,
        assignment
      ) =>
        total +
        getSubmissionCount(
          assignment
        ),
      0
    );

  const pendingGrading =
    assignments.reduce(
      (
        total,
        assignment
      ) =>
        total +
        getPendingGrading(
          assignment
        ),
      0
    );

  const totalResults =
    exams.reduce(
      (
        total,
        exam
      ) =>
        total +
        getResultCount(
          exam
        ),
      0
    );

  const completedSubmissions =
    Math.max(
      totalSubmissions -
        pendingGrading,
      0
    );

  const gradingRate =
    totalSubmissions >
    0
      ? Math.min(
          100,
          Math.round(
            (
              completedSubmissions /
              totalSubmissions
            ) *
              100
          )
        )
      : 0;

  const expectedExamEntries =
    exams.length *
    students.length;

  const resultCoverage =
    expectedExamEntries >
      0
      ? Math.min(
          100,
          Math.round(
            (
              totalResults /
              expectedExamEntries
            ) *
              100
          )
        )
      : 0;

  const uniqueCourses =
    new Set(
      timetable
        .map(
          (
            entry
          ) =>
            entry?.courseId ||
            entry?.course?.id ||
            getCourseCode(
              entry
            )
        )
        .filter(
          Boolean
        )
    ).size;

  const uniqueRooms =
    new Set(
      timetable
        .map(
          (
            entry
          ) =>
            getRoom(
              entry
            )
        )
        .filter(
          (
            room
          ) =>
            room &&
            room !==
              "Room not assigned"
        )
    ).size;

  /* ==========================================================
     WEEKLY DAY ANALYTICS
  ========================================================== */

  const dayStats =
    useMemo(() => {
      return DAY_ITEMS.map(
        (
          day
        ) => {
          const dayEntries =
            timetable.filter(
              (
                entry
              ) =>
                Number(
                  entry?.dayOfWeek
                ) ===
                day.id
            );

          const minutes =
            dayEntries.reduce(
              (
                total,
                entry
              ) =>
                total +
                calculateDurationMinutes(
                  entry?.startTime,
                  entry?.endTime
                ),
              0
            );

          return {
            ...day,
            classes:
              dayEntries.length,
            minutes,
            hours:
              minutes /
              60,
          };
        }
      );
    }, [
      timetable,
    ]);

  const maxDayHours =
    Math.max(
      ...dayStats.map(
        (
          item
        ) =>
          item.hours
      ),
      1
    );

  const busiestDay =
    [...dayStats].sort(
      (
        a,
        b
      ) =>
        b.minutes -
        a.minutes
    )[0];

  /* ==========================================================
     ASSESSMENT ANALYTICS
  ========================================================== */

  const assignmentsPerCourse =
    courses.length >
      0
      ? (
          assignments.length /
          courses.length
        ).toFixed(1)
      : "0.0";

  const examsPerCourse =
    courses.length >
      0
      ? (
          exams.length /
          courses.length
        ).toFixed(1)
      : "0.0";

  const studentLoad =
    courses.length >
      0
      ? Math.round(
          students.length /
            courses.length
        )
      : 0;

  const engagementIndex =
    totalSubmissions >
      0 &&
    students.length >
      0 &&
    assignments.length >
      0
      ? Math.min(
          100,
          Math.round(
            (
              totalSubmissions /
              (
                students.length *
                assignments.length
              )
            ) *
              100
          )
        )
      : 0;

  const workloadScore =
    Math.min(
      100,
      pendingGrading *
        8 +
        upcomingExams.length *
          8 +
        todayClasses.length *
          6 +
        assignments.length *
          2
    );

  const workloadLevel =
    workloadScore >=
    75
      ? "High"
      : workloadScore >=
        45
      ? "Moderate"
      : "Healthy";

  const workloadMessage =
    workloadLevel ===
    "High"
      ? "Your workload is high. Prioritize pending grading and upcoming examinations."
      : workloadLevel ===
        "Moderate"
      ? "Your workload is manageable, but some academic tasks need attention."
      : "Your current academic workload is well under control.";

  /* ==========================================================
     ENGAGEMENT / COURSE HEALTH
  ========================================================== */

  const academicHealth =
    gradingRate >=
      75 &&
    (
      resultCoverage >=
        50 ||
      exams.length ===
        0
    ) &&
    (
      engagementIndex >=
        50 ||
      assignments.length ===
        0
    )
      ? "Healthy"
      : gradingRate >=
            50 ||
          engagementIndex >=
            40
      ? "Needs Attention"
      : "Critical";

  /* ==========================================================
     ATTENTION ITEMS
  ========================================================== */

  const attentionItems =
    useMemo(() => {
      const items =
        [];

      if (
        pendingGrading >
        0
      ) {
        items.push({
          type:
            "warning",
          icon: (
            <ShieldAlert
              size={19}
            />
          ),
          title:
            "Pending grading",
          description:
            `${pendingGrading} submission${
              pendingGrading ===
              1
                ? ""
                : "s"
            } waiting for review.`,
          path:
            "/faculty/assignments",
          action:
            "Review now",
        });
      }

      if (
        upcomingExams.length >
        0
      ) {
        items.push({
          type:
            "info",
          icon: (
            <GraduationCap
              size={19}
            />
          ),
          title:
            "Upcoming examinations",
          description:
            `${upcomingExams.length} upcoming examination${
              upcomingExams.length ===
              1
                ? ""
                : "s"
            }.`,
          path:
            "/faculty/examinations",
          action:
            "View exams",
        });
      }

      if (
        todayClasses.length >
        0
      ) {
        items.push({
          type:
            "success",
          icon: (
            <CalendarCheck
              size={19}
            />
          ),
          title:
            "Today's teaching",
          description:
            `You have ${todayClasses.length} class${
              todayClasses.length ===
              1
                ? ""
                : "es"
            } scheduled today.`,
          path:
            "/faculty/timetable",
          action:
            "View timetable",
        });
      }

      if (
        exams.length >
          0 &&
        totalResults ===
          0
      ) {
        items.push({
          type:
            "warning",
          icon: (
            <CircleAlert
              size={19}
            />
          ),
          title:
            "Results need attention",
          description:
            "No examination result entries are currently recorded.",
          path:
            "/faculty/examinations",
          action:
            "Enter results",
        });
      }

      if (
        upcomingAssignments.length >
          0 &&
        getDaysUntil(
          upcomingAssignments[0]
            ?.dueDate
        ) !== null &&
        getDaysUntil(
          upcomingAssignments[0]
            ?.dueDate
        ) <=
          2
      ) {
        items.push({
          type:
            "info",
          icon: (
            <Timer
              size={19}
            />
          ),
          title:
            "Assignment deadline nearby",
          description:
            `${upcomingAssignments[0]?.title || "An assignment"} is due within two days.`,
          path:
            `/faculty/assignments/${upcomingAssignments[0]?.id}`,
          action:
            "Open assignment",
        });
      }

      return items.slice(
        0,
        4
      );
    }, [
      pendingGrading,
      upcomingExams,
      todayClasses,
      exams,
      totalResults,
      upcomingAssignments,
    ]);

  /* ==========================================================
     MODULES
  ========================================================== */

  const modules = [
    {
      title:
        "My Courses",
      description:
        "View assigned courses and course details.",
      icon: (
        <BookOpen
          size={25}
        />
      ),
      path:
        "/faculty/courses",
    },
    {
      title:
        "Attendance",
      description:
        "Mark attendance and analyze class participation.",
      icon: (
        <ClipboardCheck
          size={25}
        />
      ),
      path:
        "/faculty/attendance",
    },
    {
      title:
        "Assignments",
      description:
        "Create assignments and manage submissions.",
      icon: (
        <FileText
          size={25}
        />
      ),
      path:
        "/faculty/assignments",
    },
    {
      title:
        "Examinations",
      description:
        "Manage examinations and student results.",
      icon: (
        <GraduationCap
          size={25}
        />
      ),
      path:
        "/faculty/examinations",
    },
    {
      title:
        "Students",
      description:
        "Review students enrolled in your courses.",
      icon: (
        <Users
          size={25}
        />
      ),
      path:
        "/faculty/students",
    },
    {
      title:
        "Timetable",
      description:
        "View and manage your teaching schedule.",
      icon: (
        <CalendarDays
          size={25}
        />
      ),
      path:
        "/faculty/timetable",
    },
    {
      title:
        "Announcements",
      description:
        "Publish global or targeted student announcements.",
      icon: (
        <Megaphone
          size={25}
        />
      ),
      path:
        "/faculty/notices",
    },
  ];

  /* ==========================================================
     QUICK ACTIONS
  ========================================================== */

  const quickActions = [
    {
      title:
        "Mark Attendance",
      description:
        "Take today's attendance",
      icon: (
        <ClipboardCheck
          size={20}
        />
      ),
      path:
        "/faculty/attendance",
    },
    {
      title:
        "Review Assignments",
      description:
        `${pendingGrading} pending review`,
      icon: (
        <ClipboardList
          size={20}
        />
      ),
      path:
        "/faculty/assignments",
    },
    {
      title:
        "Manage Exams",
      description:
        `${upcomingExams.length} upcoming`,
      icon: (
        <GraduationCap
          size={20}
        />
      ),
      path:
        "/faculty/examinations",
    },
    {
      title:
        "Post Announcement",
      description:
        "Notify students",
      icon: (
        <Megaphone
          size={20}
        />
      ),
      path:
        "/faculty/notices",
    },
  ];

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <GraduationCap
                size={24}
              />
            </div>

            <div className="min-w-0">

              <h1 className="truncate text-xl font-bold text-slate-900 md:text-2xl">
                Campus360
              </h1>

              <p className="text-sm text-slate-500">
                Faculty Portal
              </p>

            </div>

          </div>

          <div className="flex items-center gap-2">

            <div className="hidden text-right md:block">

              <p className="text-sm font-bold text-slate-700">
                {currentTime.toLocaleTimeString(
                  "en-IN",
                  {
                    hour:
                      "2-digit",
                    minute:
                      "2-digit",
                  }
                )}
              </p>

              <p className="text-[11px] text-slate-400">
                {todayName}
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                loadDashboard({
                  isRefresh:
                    true,
                })
              }
              disabled={
                refreshing
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
              title="Refresh dashboard"
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
                Refresh
              </span>

            </button>

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-500 px-3 text-sm font-semibold text-white transition hover:bg-red-600 sm:px-4"
            >

              <LogOut
                size={18}
              />

              <span className="hidden sm:inline">
                Logout
              </span>

            </button>

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
                Dashboard data issue
              </p>

              <p className="mt-1 text-sm leading-6">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  loadDashboard({
                    isRefresh:
                      true,
                  })
                }
                className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-200"
              >
                Retry
              </button>

            </div>

            <button
              type="button"
              onClick={() =>
                setError(
                  ""
                )
              }
              className="rounded-lg p-1 text-red-400 hover:bg-red-100 hover:text-red-700"
            >

              <X size={17} />

            </button>

          </div>
        )}

        {/* ====================================================
            HERO
        ==================================================== */}

        <section className="relative overflow-hidden rounded-3xl bg-indigo-600 p-6 text-white shadow-lg sm:p-8">

          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10" />

          <div className="absolute -bottom-28 right-24 h-72 w-72 rounded-full bg-white/5" />

          <div className="relative grid gap-8 xl:grid-cols-[1fr_auto] xl:items-center">

            <div className="min-w-0">

              <div className="flex flex-wrap gap-2">

                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                  <UserRound
                    size={14}
                  />
                  {role}
                </span>

                {department?.name && (
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">
                    {
                      department.name
                    }
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1.5 text-xs font-bold text-emerald-100">

                  <CircleDot
                    size={12}
                    className="fill-current"
                  />

                  Portal Active

                </span>

                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    academicHealth ===
                    "Healthy"
                      ? "bg-green-400/20 text-green-100"
                      : academicHealth ===
                        "Needs Attention"
                      ? "bg-amber-400/20 text-amber-100"
                      : "bg-red-400/20 text-red-100"
                  }`}
                >
                  {academicHealth}
                </span>

              </div>

              <h2 className="mt-4 text-2xl font-bold sm:text-3xl lg:text-4xl">
                {greeting},{" "}
                {facultyName}
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-indigo-100 sm:text-base">

                Welcome to your Campus360 faculty workspace. Manage your teaching, academic assessments, student activity and daily schedule from one dashboard.

              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">

                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">

                  <Award
                    size={14}
                  />

                  {
                    designation
                  }

                </span>

                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">

                  <CalendarDays
                    size={14}
                  />

                  {
                    todayDate
                  }

                </span>

                {lastUpdated && (
                  <span className="inline-flex items-center gap-2 text-xs text-indigo-200">

                    <RefreshCw
                      size={13}
                    />

                    Updated{" "}
                    {lastUpdated.toLocaleTimeString(
                      "en-IN",
                      {
                        hour:
                          "2-digit",
                        minute:
                          "2-digit",
                      }
                    )}

                  </span>
                )}

              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[440px]">

              <HeroMetric
                value={
                  courses.length
                }
                label="Courses"
              />

              <HeroMetric
                value={
                  students.length
                }
                label="Students"
              />

              <HeroMetric
                value={
                  todayClasses.length
                }
                label="Today's Classes"
              />

              <HeroMetric
                value={`${weeklyTeachingHours.toFixed(
                  1
                )}h`}
                label="Weekly Hours"
              />

            </div>

          </div>

        </section>

        {/* ====================================================
            CURRENT + NEXT CLASS
        ==================================================== */}

        <section className="mt-6 grid gap-5 lg:grid-cols-2">

          <CurrentClassPanel
            entry={
              currentClass
            }
          />

          <NextClassPanel
            entry={
              nextClass
            }
            minutes={
              minutesToNextClass
            }
          />

        </section>

        {/* ====================================================
            KPI
        ==================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <KpiCard
            icon={
              <BookOpen
                size={21}
              />
            }
            label="Courses"
            value={
              courses.length
            }
            description={`${totalCredits} total credits`}
          />

          <KpiCard
            icon={
              <Users size={21} />
            }
            label="Students"
            value={
              students.length
            }
            description="Students taught"
            type="blue"
          />

          <KpiCard
            icon={
              <ClipboardCheck
                size={21}
              />
            }
            label="Assignments"
            value={
              assignments.length
            }
            description={`${pendingGrading} pending grading`}
            type="purple"
          />

          <KpiCard
            icon={
              <GraduationCap
                size={21}
              />
            }
            label="Examinations"
            value={
              exams.length
            }
            description={`${totalResults} result entries`}
            type="amber"
          />

        </section>

        {/* ====================================================
            QUICK ACTIONS
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

              <Zap
                size={21}
              />

            </div>

            <div>

              <h2 className="text-lg font-bold text-slate-900">
                Quick Actions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Frequently used faculty tasks.
              </p>

            </div>

          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            {quickActions.map(
              (
                action
              ) => (
                <button
                  type="button"
                  key={
                    action.title
                  }
                  onClick={() =>
                    navigate(
                      action.path
                    )
                  }
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
                >

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm transition group-hover:bg-indigo-600 group-hover:text-white">

                    {
                      action.icon
                    }

                  </div>

                  <div className="min-w-0 flex-1">

                    <p className="truncate text-sm font-bold text-slate-800">
                      {
                        action.title
                      }
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-500">
                      {
                        action.description
                      }
                    </p>

                  </div>

                  <ChevronRight
                    size={17}
                    className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-500"
                  />

                </button>
              )
            )}

          </div>

        </section>

        {/* ====================================================
            ANALYTICS
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

                <BarChart3
                  size={22}
                />

              </div>

              <div>

                <h2 className="text-xl font-bold text-slate-900">
                  Faculty Analytics
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Workload, engagement and assessment progress.
                </p>

              </div>

            </div>

            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                workloadLevel ===
                "High"
                  ? "bg-red-50 text-red-700"
                  : workloadLevel ===
                    "Moderate"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-green-50 text-green-700"
              }`}
            >

              <Activity
                size={14}
              />

              Workload{" "}
              {
                workloadLevel
              }

            </span>

          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <AnalyticsCard
              icon={
                <TrendingUp
                  size={19}
                />
              }
              title="Grading Rate"
              value={`${gradingRate}%`}
              description={`${completedSubmissions} reviewed`}
            />

            <AnalyticsCard
              icon={
                <Target size={19} />
              }
              title="Result Coverage"
              value={`${resultCoverage}%`}
              description={`${totalResults} result entries`}
            />

            <AnalyticsCard
              icon={
                <Activity
                  size={19}
                />
              }
              title="Engagement"
              value={`${engagementIndex}%`}
              description="Submission activity"
            />

            <AnalyticsCard
              icon={
                <Users size={19} />
              }
              title="Student Load"
              value={
                studentLoad
              }
              description="Average students per course"
            />

          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">

                  <ListChecks
                    size={19}
                  />

                </div>

                <div>

                  <h3 className="font-bold text-slate-900">
                    Assessment Progress
                  </h3>

                  <p className="text-xs text-slate-500">
                    Assignment grading and examination results.
                  </p>

                </div>

              </div>

              <div className="mt-5 space-y-5">

                <ProgressMetric
                  label="Assignment Grading"
                  value={
                    gradingRate
                  }
                  detail={`${pendingGrading} pending submissions`}
                />

                <ProgressMetric
                  label="Exam Result Coverage"
                  value={
                    resultCoverage
                  }
                  detail={`${totalResults} result entries recorded`}
                />

                <ProgressMetric
                  label="Student Engagement"
                  value={
                    engagementIndex
                  }
                  detail={`${totalSubmissions} assignment submissions`}
                />

              </div>

            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">

                  <BookOpen
                    size={19}
                  />

                </div>

                <div>

                  <h3 className="font-bold text-slate-900">
                    Teaching Load
                  </h3>

                  <p className="text-xs text-slate-500">
                    Distribution of teaching responsibilities.
                  </p>

                </div>

              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">

                <MiniInsight
                  label="Courses"
                  value={
                    courses.length
                  }
                />

                <MiniInsight
                  label="Assignments / Course"
                  value={
                    assignmentsPerCourse
                  }
                />

                <MiniInsight
                  label="Exams / Course"
                  value={
                    examsPerCourse
                  }
                />

                <MiniInsight
                  label="Weekly Hours"
                  value={`${weeklyTeachingHours.toFixed(
                    1
                  )}h`}
                />

              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">

                <MiniInsight
                  label="Unique Rooms"
                  value={
                    uniqueRooms
                  }
                />

                <MiniInsight
                  label="Scheduled Sessions"
                  value={
                    timetable.length
                  }
                />

              </div>

            </div>

          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">

            <div className="flex items-start gap-3">

              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  workloadLevel ===
                  "High"
                    ? "bg-red-50 text-red-600"
                    : workloadLevel ===
                      "Moderate"
                    ? "bg-amber-50 text-amber-600"
                    : "bg-green-50 text-green-600"
                }`}
              >

                {workloadLevel ===
                "Healthy" ? (
                  <CheckCircle2
                    size={20}
                  />
                ) : (
                  <ShieldAlert
                    size={20}
                  />
                )}

              </div>

              <div>

                <div className="flex flex-wrap items-center gap-2">

                  <h3 className="font-bold text-slate-900">
                    Workload Recommendation
                  </h3>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      workloadLevel ===
                      "High"
                        ? "bg-red-50 text-red-700"
                        : workloadLevel ===
                          "Moderate"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-green-50 text-green-700"
                    }`}
                  >

                    {
                      workloadLevel
                    }

                  </span>

                </div>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {
                    workloadMessage
                  }
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* ====================================================
            WEEKLY WORKLOAD
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

                <CalendarDays
                  size={22}
                />

              </div>

              <div>

                <h2 className="text-xl font-bold text-slate-900">
                  Weekly Workload
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Scheduled teaching distribution across the week.
                </p>

              </div>

            </div>

            <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">

              {
                weeklyTeachingHours.toFixed(
                  1
                )
              }
              h / week

            </span>

          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-7">

            {dayStats.map(
              (
                day
              ) => {

                const width =
                  Math.round(
                    (
                      day.hours /
                      maxDayHours
                    ) *
                      100
                  );

                const isToday =
                  day.id ===
                  todayNumber;

                return (
                  <button
                    type="button"
                    key={
                      day.id
                    }
                    onClick={() =>
                      navigate(
                        "/faculty/timetable"
                      )
                    }
                    className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                      isToday
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >

                    <div className="flex items-center justify-between">

                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        {
                          day.short
                        }
                      </p>

                      {isToday && (
                        <span className="rounded-full bg-indigo-600 px-2 py-1 text-[9px] font-bold text-white">
                          TODAY
                        </span>
                      )}

                    </div>

                    <p className="mt-3 text-xl font-bold text-slate-800">
                      {
                        day.hours.toFixed(
                          1
                        )
                      }
                      h
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {
                        day.classes
                      }
                      {" "}
                      class
                      {
                        day.classes !==
                        1
                          ? "es"
                          : ""}
                    </p>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">

                      <div
                        className="h-full rounded-full bg-indigo-600"
                        style={{
                          width: `${width}%`,
                        }}
                      />

                    </div>

                  </button>
                );
              }
            )}

          </div>

          <div className="mt-5 flex flex-wrap gap-3">

            <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
              Weekly{" "}
              {
                weeklyTeachingHours.toFixed(
                  1
                )
              }
              h
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">

              Busiest:
              {" "}
              {
                busiestDay?.label ||
                "—"
              }

            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">

              {
                uniqueCourses
              }
              {" "}
              course
              {
                uniqueCourses !==
                1
                  ? "s"
                  : ""
              }
              {" "}
              scheduled

            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">

              {
                uniqueRooms
              }
              {" "}
              rooms

            </span>

          </div>

        </section>

        {/* ====================================================
            ATTENTION CENTER
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">

              <CircleAlert
                size={22}
              />

            </div>

            <div>

              <h2 className="text-lg font-bold text-slate-900">
                Attention Center
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Important actions and schedule indicators.
              </p>

            </div>

          </div>

          {attentionItems.length ===
          0 ? (

            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">

              <CheckCircle2
                size={21}
                className="shrink-0 text-green-600"
              />

              <div>

                <p className="font-bold text-green-800">
                  Everything looks good
                </p>

                <p className="mt-1 text-sm text-green-700">
                  No urgent dashboard actions are currently detected.
                </p>

              </div>

            </div>

          ) : (

            <div className="mt-5 grid gap-4 md:grid-cols-2">

              {attentionItems.map(
                (
                  item,
                  index
                ) => (
                  <AttentionItem
                    key={`${item.title}-${index}`}
                    item={
                      item
                    }
                    onClick={() =>
                      navigate(
                        item.path
                      )
                    }
                  />
                )
              )}

            </div>

          )}

        </section>

        {/* ====================================================
            TODAY'S CLASSES
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <div className="flex items-center gap-2">

                <CalendarCheck
                  size={21}
                  className="text-indigo-600"
                />

                <h2 className="text-lg font-bold">
                  Today's Classes
                </h2>

              </div>

              <p className="mt-1 text-sm text-slate-500">

                {
                  todayName
                }
                ,
                {" "}
                {
                  todayDate
                }
                {" "}
                ·
                {" "}
                {
                  todayTeachingHours.toFixed(
                    1
                  )
                }
                h teaching

              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/faculty/timetable"
                )
              }
              className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700"
            >

              Full timetable

              <ArrowRight
                size={16}
              />

            </button>

          </div>

          {todayClasses.length ===
          0 ? (

            <div className="mt-5">
              <EmptyRow text="No classes are scheduled for today." />
            </div>

          ) : (

            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">

              {todayClasses.map(
                (
                  entry
                ) => (
                  <TodayClassCard
                    key={
                      entry.id
                    }
                    entry={
                      entry
                    }
                  />
                )
              )}

            </div>

          )}

        </section>

        {/* ====================================================
            UPCOMING ASSIGNMENTS + EXAMS
        ==================================================== */}

        <section className="mt-8 grid gap-6 lg:grid-cols-2">

          <UpcomingAssignments
            assignments={
              upcomingAssignments
            }
            loading={
              loading
            }
            navigate={
              navigate
            }
            totalSubmissions={
              totalSubmissions
            }
          />

          <UpcomingExams
            exams={
              upcomingExams
            }
            loading={
              loading
            }
            navigate={
              navigate
            }
            totalResults={
              totalResults
            }
          />

        </section>

        {/* ====================================================
            MODULES
        ==================================================== */}

        <section className="mt-8">

          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <h2 className="text-xl font-bold">
                Faculty Modules
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Access every faculty function from one place.
              </p>

            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">

              <LayoutGrid
                size={14}
              />

              {
                modules.length
              }
              modules

            </span>

          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

            {modules.map(
              (
                module
              ) => (
                <ModuleCard
                  key={
                    module.title
                  }
                  module={
                    module
                  }
                  onClick={() =>
                    navigate(
                      module.path
                    )
                  }
                />
              )
            )}

          </div>

        </section>

        {/* ====================================================
            FACULTY PROFILE
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-bold text-indigo-600">
                {
                  getInitials(
                    facultyName
                  )
                }
              </div>

              <div>

                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Faculty Profile
                </p>

                <h2 className="mt-1 text-lg font-bold text-slate-800">
                  {
                    facultyName
                  }
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {
                    designation
                  }
                  {department?.name
                    ? ` · ${department.name}`
                    : ""}
                </p>

              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              <ProfileMetric
                label="Courses"
                value={
                  courses.length
                }
              />

              <ProfileMetric
                label="Students"
                value={
                  students.length
                }
              />

              <ProfileMetric
                label="Assignments"
                value={
                  assignments.length
                }
              />

              <ProfileMetric
                label="Exams"
                value={
                  exams.length
                }
              />

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

/* ============================================================
   HERO METRIC
============================================================ */

function HeroMetric({
  value,
  label,
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
   CURRENT CLASS PANEL
============================================================ */

function CurrentClassPanel({
  entry,
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${
        entry
          ? "border-green-200 bg-green-50"
          : "border-slate-200 bg-white"
      }`}
    >

      <div className="flex items-center justify-between gap-3">

        <div className="flex items-center gap-3">

          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              entry
                ? "bg-green-100 text-green-600"
                : "bg-slate-100 text-slate-500"
            }`}
          >

            <Zap size={21} />

          </div>

          <div>

            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Current Class
            </p>

            <h3 className="mt-1 font-bold text-slate-900">
              {entry
                ? getCourseName(
                    entry
                  )
                : "No active class"}
            </h3>

          </div>

        </div>

        {entry && (
          <span className="animate-pulse rounded-full bg-green-100 px-3 py-1.5 text-[10px] font-bold text-green-700">
            LIVE NOW
          </span>
        )}

      </div>

      {entry ? (

        <div className="mt-5 grid gap-3 sm:grid-cols-3">

          <InfoChip
            icon={
              <Clock3
                size={15}
              />
            }
            text={`${formatTime(
              entry.startTime
            )} - ${formatTime(
              entry.endTime
            )}`}
          />

          <InfoChip
            icon={
              <MapPin
                size={15}
              />
            }
            text={
              getRoom(
                entry
              )
            }
          />

          <InfoChip
            icon={
              <BookOpen
                size={15}
              />
            }
            text={
              getCourseCode(
                entry
              )
            }
          />

        </div>

      ) : (

        <p className="mt-4 text-sm leading-6 text-slate-500">
          No timetable session is currently in progress.
        </p>

      )}

    </div>
  );
}

/* ============================================================
   NEXT CLASS PANEL
============================================================ */

function NextClassPanel({
  entry,
  minutes,
}) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm sm:p-6">

      <div className="flex items-center justify-between gap-3">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">

            <Timer size={21} />

          </div>

          <div>

            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Next Class
            </p>

            <h3 className="mt-1 font-bold text-slate-900">
              {entry
                ? getCourseName(
                    entry
                  )
                : "No more classes"}
            </h3>

          </div>

        </div>

        {entry &&
          minutes !==
            null && (
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-blue-700">

              {minutes <=
              0
                ? "Starting"
                : `In ${minutes} min`}

            </span>
          )}

      </div>

      {entry ? (

        <div className="mt-5 grid gap-3 sm:grid-cols-3">

          <InfoChip
            icon={
              <Clock3
                size={15}
              />
            }
            text={`${formatTime(
              entry.startTime
            )} - ${formatTime(
              entry.endTime
            )}`}
          />

          <InfoChip
            icon={
              <MapPin
                size={15}
              />
            }
            text={
              getRoom(
                entry
              )
            }
          />

          <InfoChip
            icon={
              <GraduationCap
                size={15}
              />
            }
            text={
              entry.classType ||
              entry.sessionType ||
              "Lecture"
            }
          />

        </div>

      ) : (

        <p className="mt-4 text-sm leading-6 text-slate-500">
          Your teaching schedule is clear for the rest of today.
        </p>

      )}

    </div>
  );
}

/* ============================================================
   KPI CARD
============================================================ */

function KpiCard({
  icon,
  label,
  value,
  description,
  type = "indigo",
}) {
  const styles = {
    indigo:
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
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles[type]}`}
      >
        {icon}
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {label}
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
   ANALYTICS CARD
============================================================ */

function AnalyticsCard({
  icon,
  title,
  value,
  description,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

      <div className="flex items-center justify-between gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">

          {icon}

        </div>

        <p className="text-2xl font-bold text-slate-900">
          {value}
        </p>

      </div>

      <p className="mt-4 text-sm font-bold text-slate-700">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>

    </div>
  );
}

/* ============================================================
   PROGRESS METRIC
============================================================ */

function ProgressMetric({
  label,
  value,
  detail,
}) {
  const safeValue =
    Math.max(
      0,
      Math.min(
        Number(value) ||
          0,
        100
      )
    );

  return (
    <div>

      <div className="flex items-center justify-between gap-3">

        <p className="text-sm font-semibold text-slate-700">
          {label}
        </p>

        <span className="text-sm font-bold text-indigo-600">
          {
            safeValue
          }%
        </span>

      </div>

      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">

        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-500"
          style={{
            width: `${safeValue}%`,
          }}
        />

      </div>

      <p className="mt-1 text-xs text-slate-400">
        {detail}
      </p>

    </div>
  );
}

/* ============================================================
   MINI INSIGHT
============================================================ */

function MiniInsight({
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-white p-4">

      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}

/* ============================================================
   INFO CHIP
============================================================ */

function InfoChip({
  icon,
  text,
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600">

      <span className="shrink-0 text-indigo-600">
        {icon}
      </span>

      <span className="truncate">
        {text}
      </span>

    </div>
  );
}

/* ============================================================
   ATTENTION ITEM
============================================================ */

function AttentionItem({
  item,
  onClick,
}) {
  const styles = {
    warning: {
      wrapper:
        "border-amber-200 bg-amber-50",
      icon:
        "bg-white text-amber-600",
      title:
        "text-amber-900",
      text:
        "text-amber-700",
      button:
        "bg-amber-600 hover:bg-amber-700",
    },
    info: {
      wrapper:
        "border-blue-200 bg-blue-50",
      icon:
        "bg-white text-blue-600",
      title:
        "text-blue-900",
      text:
        "text-blue-700",
      button:
        "bg-blue-600 hover:bg-blue-700",
    },
    success: {
      wrapper:
        "border-green-200 bg-green-50",
      icon:
        "bg-white text-green-600",
      title:
        "text-green-900",
      text:
        "text-green-700",
      button:
        "bg-green-600 hover:bg-green-700",
    },
  };

  const selected =
    styles[
      item.type
    ] ||
    styles.info;

  return (
    <div
      className={`rounded-2xl border p-5 ${selected.wrapper}`}
    >

      <div className="flex items-start gap-3">

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${selected.icon}`}
        >
          {item.icon}
        </div>

        <div className="min-w-0 flex-1">

          <p
            className={`font-bold ${selected.title}`}
          >
            {
              item.title
            }
          </p>

          <p
            className={`mt-1 text-sm leading-6 ${selected.text}`}
          >
            {
              item.description
            }
          </p>

          <button
            type="button"
            onClick={
              onClick
            }
            className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white ${selected.button}`}
          >

            {
              item.action
            }

            <ArrowRight
              size={15}
            />

          </button>

        </div>

      </div>

    </div>
  );
}

/* ============================================================
   TODAY CLASS CARD
============================================================ */

function TodayClassCard({
  entry,
}) {
  const state =
    getClassState(
      entry
    );

  const stateStyles = {
    current:
      "border-green-300 bg-green-50",
    upcoming:
      "border-indigo-200 bg-indigo-50",
    completed:
      "border-slate-200 bg-slate-50",
    scheduled:
      "border-slate-200 bg-slate-50",
  };

  return (
    <div
      className={`rounded-2xl border p-4 ${stateStyles[state]}`}
    >

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">

          <p className="text-xs font-bold text-indigo-600">
            {
              getCourseCode(
                entry
              )
            }
          </p>

          <h3 className="mt-1 truncate font-bold text-slate-800">
            {
              getCourseName(
                entry
              )
            }
          </h3>

        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
            state ===
            "current"
              ? "bg-green-100 text-green-700"
              : state ===
                "upcoming"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-slate-200 text-slate-600"
          }`}
        >

          {state ===
          "current"
            ? "CURRENT"
            : state ===
              "upcoming"
            ? "NEXT"
            : "DONE"}

        </span>

      </div>

      <div className="mt-4 space-y-2 text-xs text-slate-500">

        <div className="flex items-center gap-2">

          <Clock3
            size={15}
          />

          {
            formatTime(
              entry.startTime
            )
          }
          {" "}
          -
          {" "}
          {
            formatTime(
              entry.endTime
            )
          }

        </div>

        <div className="flex items-center gap-2">

          <MapPin
            size={15}
          />

          {
            getRoom(
              entry
            )
          }

        </div>

        <div className="flex items-center gap-2">

          <BookOpen
            size={15}
          />

          {
            entry.classType ||
            entry.sessionType ||
            "Lecture"
          }

        </div>

      </div>

    </div>
  );
}

/* ============================================================
   UPCOMING ASSIGNMENTS
============================================================ */

function UpcomingAssignments({
  assignments,
  loading,
  navigate,
  totalSubmissions,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

      <div className="flex items-center justify-between gap-3">

        <div>

          <div className="flex items-center gap-2">

            <FileText
              size={21}
              className="text-indigo-600"
            />

            <h2 className="text-lg font-bold">
              Upcoming Assignments
            </h2>

          </div>

          <p className="mt-1 text-sm text-slate-500">
            {
              totalSubmissions
            }
            {" "}
            total submissions
          </p>

        </div>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/faculty/assignments"
            )
          }
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
        >
          View all
        </button>

      </div>

      {loading ? (

        <div className="mt-5">
          <LoadingRow text="Loading assignments..." />
        </div>

      ) : assignments.length ===
        0 ? (

        <div className="mt-5">
          <EmptyRow text="No upcoming assignments." />
        </div>

      ) : (

        <div className="mt-5 space-y-3">

          {assignments.map(
            (
              assignment
            ) => {

              const days =
                getDaysUntil(
                  assignment.dueDate
                );

              const submissions =
                getSubmissionCount(
                  assignment
                );

              const pending =
                getPendingGrading(
                  assignment
                );

              return (
                <button
                  type="button"
                  key={
                    assignment.id
                  }
                  onClick={() =>
                    navigate(
                      `/faculty/assignments/${assignment.id}`
                    )
                  }
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
                >

                  <div className="flex items-start justify-between gap-3">

                    <div className="min-w-0">

                      <p className="text-xs font-bold text-indigo-600">
                        {
                          getCourseCode(
                            assignment
                          )
                        }
                      </p>

                      <p className="mt-1 truncate font-semibold text-slate-800">
                        {
                          assignment.title ||
                          assignment.name ||
                          "Assignment"
                        }
                      </p>

                    </div>

                    <ArrowRight
                      size={16}
                      className="shrink-0 text-slate-300"
                    />

                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-500">

                    <span>
                      Due{" "}
                      {
                        formatDate(
                          assignment.dueDate
                        )
                      }
                    </span>

                    <span
                      className={`rounded-full px-2 py-1 font-bold ${
                        (
                          days ??
                          99
                        ) <=
                        2
                          ? "bg-red-50 text-red-600"
                          : (
                              days ??
                              99
                            ) <=
                            7
                          ? "bg-amber-50 text-amber-700"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {
                        getUrgencyText(
                          assignment.dueDate
                        )
                      }
                    </span>

                    <span>
                      Submissions{" "}
                      {
                        submissions
                      }
                    </span>

                    <span>
                      Pending{" "}
                      {
                        pending
                      }
                    </span>

                  </div>

                </button>
              );
            }
          )}

        </div>

      )}

    </div>
  );
}

/* ============================================================
   UPCOMING EXAMS
============================================================ */

function UpcomingExams({
  exams,
  loading,
  navigate,
  totalResults,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

      <div className="flex items-center justify-between gap-3">

        <div>

          <div className="flex items-center gap-2">

            <GraduationCap
              size={21}
              className="text-indigo-600"
            />

            <h2 className="text-lg font-bold">
              Upcoming Examinations
            </h2>

          </div>

          <p className="mt-1 text-sm text-slate-500">
            {
              totalResults
            }
            {" "}
            result entries
          </p>

        </div>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/faculty/examinations"
            )
          }
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
        >
          View all
        </button>

      </div>

      {loading ? (

        <div className="mt-5">
          <LoadingRow text="Loading examinations..." />
        </div>

      ) : exams.length ===
        0 ? (

        <div className="mt-5">
          <EmptyRow text="No upcoming examinations." />
        </div>

      ) : (

        <div className="mt-5 space-y-3">

          {exams.map(
            (
              exam
            ) => {

              const resultCount =
                getResultCount(
                  exam
                );

              const days =
                getDaysUntil(
                  exam.examDate
                );

              return (
                <button
                  type="button"
                  key={
                    exam.id
                  }
                  onClick={() =>
                    navigate(
                      `/faculty/examinations/${exam.id}`
                    )
                  }
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
                >

                  <div className="flex items-start justify-between gap-3">

                    <div className="min-w-0">

                      <p className="text-xs font-bold text-indigo-600">
                        {
                          getCourseCode(
                            exam
                          )
                        }
                      </p>

                      <p className="mt-1 truncate font-semibold text-slate-800">
                        {
                          exam.title ||
                          exam.name ||
                          "Examination"
                        }
                      </p>

                    </div>

                    <ArrowRight
                      size={16}
                      className="shrink-0 text-slate-300"
                    />

                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-500">

                    <span>
                      {
                        formatDateTime(
                          exam.examDate
                        )
                      }
                    </span>

                    <span
                      className={`rounded-full px-2 py-1 font-bold ${
                        (
                          days ??
                          99
                        ) <=
                        3
                          ? "bg-red-50 text-red-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {
                        getUrgencyText(
                          exam.examDate
                        )
                      }
                    </span>

                    <span>
                      Max Marks{" "}
                      {
                        exam.maxMarks ??
                        "—"
                      }
                    </span>

                    <span>
                      Results{" "}
                      {
                        resultCount
                      }
                    </span>

                  </div>

                </button>
              );
            }
          )}

        </div>

      )}

    </div>
  );
}

/* ============================================================
   MODULE CARD
============================================================ */

function ModuleCard({
  module,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
    >

      <div className="flex items-start justify-between gap-3">

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">

          {
            module.icon
          }

        </div>

        <ArrowRight
          size={18}
          className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-600"
        />

      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-800">
        {
          module.title
        }
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {
          module.description
        }
      </p>

      <p className="mt-4 text-xs font-bold text-indigo-600">
        Open module →
      </p>

    </button>
  );
}

/* ============================================================
   PROFILE METRIC
============================================================ */

function ProfileMetric({
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
   LOADING
============================================================ */

function LoadingRow({
  text,
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">

      <RefreshCw
        size={18}
        className="animate-spin"
      />

      {
        text
      }

    </div>
  );
}

/* ============================================================
   EMPTY
============================================================ */

function EmptyRow({
  text,
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
      {
        text
      }
    </div>
  );
}

export default FacultyDashboard;