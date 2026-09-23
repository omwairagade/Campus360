import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ClipboardList,
  FileText,
  Filter,
  GraduationCap,
  Layers3,
  MapPin,
  RefreshCw,
  Search,
  Target,
  UserCheck,
  Users,
  X,
  Activity,
  CircleAlert,
  ListChecks,
  Mail,
} from "lucide-react";

import {
  apiGet,
} from "../api";

/* ============================================================
   HELPERS
============================================================ */

const getArray = (
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

const normalizeText = (
  value
) =>
  String(
    value ?? ""
  )
    .trim()
    .toLowerCase();

const getCourseId = (
  item
) =>
  item?.courseId ??
  item?.course?.id ??
  item?.courseID;

const getCourseName = (
  item
) =>
  item?.course?.name ||
  item?.course?.title ||
  item?.courseName ||
  item?.name ||
  item?.title ||
  "Course";

const getCourseCode = (
  item
) =>
  item?.course?.code ||
  item?.course?.courseCode ||
  item?.courseCode ||
  item?.code ||
  "N/A";

const getStudentName = (
  student
) => {
  if (student?.name) {
    return student.name;
  }

  if (student?.fullName) {
    return student.fullName;
  }

  const firstName =
    student?.user?.firstName ||
    student?.firstName ||
    "";

  const lastName =
    student?.user?.lastName ||
    student?.lastName ||
    "";

  return (
    `${firstName} ${lastName}`.trim() ||
    "Student"
  );
};

const getStudentEnrollment = (
  student
) =>
  student?.enrollmentNumber ||
  student?.enrollment ||
  student?.studentCode ||
  student?.registrationNumber ||
  student?.rollNumber ||
  "N/A";

const getStudentEmail = (
  student
) =>
  student?.user?.email ||
  student?.email ||
  "";

const getStudentInitials = (
  name
) => {
  const parts =
    String(name)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length ===
    0
  ) {
    return "S";
  }

  if (
    parts.length ===
    1
  ) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return `${parts[0].charAt(
    0
  )}${parts[
    parts.length - 1
  ].charAt(
    0
  )}`.toUpperCase();
};

const getDayName = (
  day
) => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const numeric =
    Number(day);

  if (
    Number.isNaN(
      numeric
    )
  ) {
    return day
      ? String(day)
      : "—";
  }

  if (
    numeric >= 0 &&
    numeric <= 6
  ) {
    return days[numeric];
  }

  if (
    numeric >= 1 &&
    numeric <= 7
  ) {
    return days[
      numeric === 7
        ? 0
        : numeric
    ];
  }

  return "—";
};

const parseTimeToMinutes = (
  value
) => {
  if (!value) {
    return null;
  }

  const match =
    String(value).match(
      /^(\d{1,2}):(\d{2})/
    );

  if (!match) {
    return null;
  }

  const hour =
    Number(
      match[1]
    );

  const minute =
    Number(
      match[2]
    );

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
};

const formatTime = (
  value
) => {
  if (!value) {
    return "—";
  }

  const match =
    String(value).match(
      /^(\d{1,2}):(\d{2})/
    );

  if (!match) {
    return String(value);
  }

  const hour =
    Number(
      match[1]
    );

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

const getDurationMinutes = (
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
    end === null ||
    end <= start
  ) {
    return 0;
  }

  return (
    end - start
  );
};

const formatDuration = (
  minutes
) => {
  if (
    !minutes ||
    minutes <= 0
  ) {
    return "—";
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  const remaining =
    minutes % 60;

  if (
    hours === 0
  ) {
    return `${remaining} min`;
  }

  if (
    remaining === 0
  ) {
    return `${hours}h`;
  }

  return `${hours}h ${remaining}m`;
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

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
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

  return date.toLocaleString(
    "en-IN",
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
    }
  );
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

  target.setHours(
    0,
    0,
    0,
    0
  );

  return Math.ceil(
    (
      target.getTime() -
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

const getStatusText = (
  value
) => {
  const days =
    getDaysUntil(value);

  if (
    days === null
  ) {
    return "Date unavailable";
  }

  if (
    days < 0
  ) {
    return "Overdue";
  }

  if (
    days === 0
  ) {
    return "Today";
  }

  if (
    days === 1
  ) {
    return "Tomorrow";
  }

  return `In ${days} days`;
};

const getAttendanceStatus = (
  record
) =>
  normalizeText(
    record?.status ||
      record?.attendanceStatus ||
      record?.state ||
      ""
  );

const isPresentStatus = (
  record
) => {
  const status =
    getAttendanceStatus(
      record
    );

  return (
    status ===
      "present" ||
    status === "p" ||
    status ===
      "late-present"
  );
};

const isAbsentStatus = (
  record
) => {
  const status =
    getAttendanceStatus(
      record
    );

  return (
    status ===
      "absent" ||
    status === "a"
  );
};

const getAssignmentSubmissions = (
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

const getExamResultCount = (
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

function FacultyCourseDetails() {
  const {
    id,
  } = useParams();

  const navigate =
    useNavigate();

  const [
    course,
    setCourse,
  ] = useState(null);

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
    attendance,
    setAttendance,
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
    attendanceLoading,
    setAttendanceLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    attendanceWarning,
    setAttendanceWarning,
  ] = useState("");

  const [
    studentSearch,
    setStudentSearch,
  ] = useState("");

  const [
    studentFilter,
    setStudentFilter,
  ] = useState("ALL");

  const [
    studentView,
    setStudentView,
  ] = useState("table");

  const [
    studentSort,
    setStudentSort,
  ] = useState("name");

  /* ==========================================================
     TODAY ATTENDANCE
  ========================================================== */

  const loadTodayAttendance =
    useCallback(
      async () => {
        try {
          setAttendanceLoading(
            true
          );

          setAttendanceWarning(
            ""
          );

          const today =
            new Date()
              .toISOString()
              .split("T")[0];

          const response =
            await apiGet(
              `/attendance/faculty/course/${id}?date=${today}`
            );

          const records =
            getArray(
              response,
              [
                "attendance",
                "records",
                "students",
                "data",
              ]
            );

          setAttendance(
            records
          );
        } catch (
          attendanceError
        ) {
          console.warn(
            "Could not load today's attendance:",
            attendanceError
          );

          setAttendance(
            []
          );

          setAttendanceWarning(
            attendanceError?.message ||
              "Today's attendance records are not available."
          );
        } finally {
          setAttendanceLoading(
            false
          );
        }
      },
      [id]
    );

  /* ==========================================================
     LOAD COURSE DETAILS
  ========================================================== */

  const loadCourseDetails =
    useCallback(
      async (
        isRefresh = false
      ) => {
        try {
          if (
            isRefresh
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError("");

          const [
            coursesResponse,
            studentsResponse,
            assignmentsResponse,
            examsResponse,
            timetableResponse,
          ] =
            await Promise.all([
              apiGet(
                "/faculty/my-courses"
              ),
              apiGet(
                "/student/faculty/students"
              ),
              apiGet(
                "/assignments/faculty/my-assignments"
              ),
              apiGet(
                "/exams/faculty/my-exams"
              ),
              apiGet(
                "/timetable/faculty/my-timetable"
              ),
            ]);

          const courseList =
            getArray(
              coursesResponse,
              [
                "courses",
                "data",
              ]
            );

          const studentList =
            getArray(
              studentsResponse,
              [
                "students",
                "data",
              ]
            );

          const assignmentList =
            getArray(
              assignmentsResponse,
              [
                "assignments",
                "data",
              ]
            );

          const examList =
            getArray(
              examsResponse,
              [
                "exams",
                "data",
              ]
            );

          const timetableList =
            getArray(
              timetableResponse,
              [
                "timetable",
                "entries",
                "data",
              ]
            );

          const selectedCourse =
            courseList.find(
              (
                item
              ) =>
                String(
                  item?.id ??
                    item?.courseId
                ) ===
                String(id)
            );

          if (
            !selectedCourse
          ) {
            throw new Error(
              "Course not found in your assigned courses."
            );
          }

          setCourse(
            selectedCourse
          );

          const filterByCourse =
            (
              item
            ) => {
              const itemCourseId =
                getCourseId(
                  item
                );

              return (
                String(
                  itemCourseId
                ) ===
                String(id)
              );
            };

          const courseStudents =
            studentList.filter(
              (
                student
              ) => {
                const courseIds =
                  student?.courseIds ||
                  student?.enrolledCourseIds ||
                  student?.courses?.map(
                    (
                      item
                    ) =>
                      item?.id
                  ) ||
                  [];

                if (
                  Array.isArray(
                    courseIds
                  ) &&
                  courseIds.length >
                    0
                ) {
                  return courseIds.some(
                    (
                      courseId
                    ) =>
                      String(
                        courseId
                      ) ===
                      String(id)
                  );
                }

                const studentCourseId =
                  student?.courseId ??
                  student?.course?.id;

                if (
                  studentCourseId !=
                  null
                ) {
                  return (
                    String(
                      studentCourseId
                    ) ===
                    String(id)
                  );
                }

                return true;
              }
            );

          setStudents(
            courseStudents
          );

          setAssignments(
            assignmentList.filter(
              filterByCourse
            )
          );

          setExams(
            examList.filter(
              filterByCourse
            )
          );

          setTimetable(
            timetableList.filter(
              filterByCourse
            )
          );

          await loadTodayAttendance();
        } catch (
          err
        ) {
          console.error(
            "Failed to load course details:",
            err
          );

          setError(
            err?.message ||
              "Failed to load course management data."
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
      [
        id,
        loadTodayAttendance,
      ]
    );

  useEffect(() => {
    loadCourseDetails();
  }, [
    loadCourseDetails,
  ]);

  /* ==========================================================
     COURSE INFO
  ========================================================== */

  const courseName =
    course?.name ||
    course?.courseName ||
    course?.title ||
    "Course";

  const courseCode =
    course?.code ||
    course?.courseCode ||
    "N/A";

  const semester =
    course?.semester ??
    course?.sem ??
    "—";

  const credits =
    course?.credits ??
    course?.credit ??
    "—";

  const departmentName =
    course?.department
      ?.name ||
    course?.departmentName ||
    "Department not assigned";

  const courseType =
    course?.type ||
    course?.courseType ||
    course?.category ||
    "Course";

  const courseDescription =
    course?.description ||
    course?.overview ||
    course?.details ||
    "";

  /* ==========================================================
     STUDENT FILTER
  ========================================================== */

  const filteredStudents =
    useMemo(() => {
      const term =
        normalizeText(
          studentSearch
        );

      const result =
        students.filter(
          (
            student
          ) => {
            const name =
              getStudentName(
                student
              );

            const enrollment =
              getStudentEnrollment(
                student
              );

            const email =
              getStudentEmail(
                student
              );

            const searchable =
              [
                name,
                enrollment,
                email,
                student?.batch,
                student?.division,
              ]
                .join(" ")
                .toLowerCase();

            const matchesSearch =
              !term ||
              searchable.includes(
                term
              );

            const matchesFilter =
              studentFilter ===
                "ALL" ||
              (
                studentFilter ===
                  "BATCH_1" &&
                String(
                  student?.batch
                ) === "1"
              ) ||
              (
                studentFilter ===
                  "BATCH_2" &&
                String(
                  student?.batch
                ) === "2"
              ) ||
              (
                studentFilter ===
                  "DIV_A" &&
                String(
                  student?.division
                ).toUpperCase() ===
                  "A"
              ) ||
              (
                studentFilter ===
                  "DIV_B" &&
                String(
                  student?.division
                ).toUpperCase() ===
                  "B"
              );

            return (
              matchesSearch &&
              matchesFilter
            );
          }
        );

      return [
        ...result,
      ].sort(
        (
          a,
          b
        ) => {
          if (
            studentSort ===
            "enrollment"
          ) {
            return getStudentEnrollment(
              a
            ).localeCompare(
              getStudentEnrollment(
                b
              )
            );
          }

          if (
            studentSort ===
            "batch"
          ) {
            return String(
              a?.batch ||
                ""
            ).localeCompare(
              String(
                b?.batch ||
                  ""
              )
            );
          }

          return getStudentName(
            a
          ).localeCompare(
            getStudentName(
              b
            )
          );
        }
      );
    }, [
      students,
      studentSearch,
      studentFilter,
      studentSort,
    ]);

  /* ==========================================================
     ATTENDANCE ANALYTICS
  ========================================================== */

  const totalAttendanceRecords =
    attendance.length;

  const presentCount =
    attendance.filter(
      isPresentStatus
    ).length;

  const absentCount =
    attendance.filter(
      isAbsentStatus
    ).length;

  const otherAttendanceCount =
    Math.max(
      totalAttendanceRecords -
        presentCount -
        absentCount,
      0
    );

  const attendancePercentage =
    totalAttendanceRecords >
    0
      ? Math.round(
          (
            presentCount /
            totalAttendanceRecords
          ) *
            100
        )
      : 0;

  /* ==========================================================
     ASSIGNMENT ANALYTICS
  ========================================================== */

  const totalAssignmentSubmissions =
    assignments.reduce(
      (
        total,
        assignment
      ) =>
        total +
        getAssignmentSubmissions(
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

  const gradedSubmissions =
    Math.max(
      totalAssignmentSubmissions -
        pendingGrading,
      0
    );

  const gradingRate =
    totalAssignmentSubmissions >
    0
      ? Math.round(
          (
            gradedSubmissions /
            totalAssignmentSubmissions
          ) *
            100
        )
      : 0;

  const upcomingAssignments =
    useMemo(() => {
      return [
        ...assignments,
      ]
        .filter(
          (
            assignment
          ) =>
            assignment?.dueDate &&
            new Date(
              assignment.dueDate
            ) >=
              new Date()
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
          5
        );
    }, [
      assignments,
    ]);

  /* ==========================================================
     EXAM ANALYTICS
  ========================================================== */

  const upcomingExams =
    useMemo(() => {
      return [
        ...exams,
      ]
        .filter(
          (
            exam
          ) =>
            exam?.examDate &&
            new Date(
              exam.examDate
            ) >=
              new Date()
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
          5
        );
    }, [
      exams,
    ]);

  const completedExams =
    useMemo(() => {
      return exams.filter(
        (
          exam
        ) =>
          exam?.examDate &&
          new Date(
            exam.examDate
          ) <
            new Date()
      );
    }, [
      exams,
    ]);

  const totalExamResults =
    exams.reduce(
      (
        total,
        exam
      ) =>
        total +
        getExamResultCount(
          exam
        ),
      0
    );

  const examsWithResults =
    completedExams.filter(
      (
        exam
      ) =>
        getExamResultCount(
          exam
        ) > 0
    );

  const examsAwaitingResults =
    completedExams.filter(
      (
        exam
      ) =>
        getExamResultCount(
          exam
        ) === 0
    );

  const examResultCoverage =
    completedExams.length >
    0
      ? Math.round(
          (
            examsWithResults.length /
            completedExams.length
          ) *
            100
        )
      : 0;

  /* ==========================================================
     TIMETABLE ANALYTICS
  ========================================================== */

  const totalTeachingMinutes =
    timetable.reduce(
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

  const totalTeachingHours =
    totalTeachingMinutes /
    60;

  const uniqueRooms =
    new Set(
      timetable
        .map(
          (
            entry
          ) =>
            entry?.room ||
            entry?.roomNumber
        )
        .filter(
          Boolean
        )
    ).size;

  const practicalCount =
    timetable.filter(
      (
        entry
      ) => {
        const type =
          normalizeText(
            entry?.classType ||
              entry?.sessionType ||
              ""
          );

        return (
          type ===
            "practical" ||
          type === "lab"
        );
      }
    ).length;

  const lectureCount =
    Math.max(
      timetable.length -
        practicalCount,
      0
    );

  /* ==========================================================
     STUDENT DISTRIBUTIONS
  ========================================================== */

  const batchDistribution =
    useMemo(() => {
      const map =
        new Map();

      students.forEach(
        (
          student
        ) => {
          const batch =
            String(
              student?.batch ||
                "Unassigned"
            );

          map.set(
            batch,
            (
              map.get(
                batch
              ) || 0
            ) + 1
          );
        }
      );

      return [
        ...map.entries(),
      ].sort(
        (
          a,
          b
        ) =>
          b[1] -
          a[1]
      );
    }, [
      students,
    ]);

  const divisionDistribution =
    useMemo(() => {
      const map =
        new Map();

      students.forEach(
        (
          student
        ) => {
          const division =
            String(
              student?.division ||
                "Unassigned"
            )
              .trim()
              .toUpperCase();

          map.set(
            division,
            (
              map.get(
                division
              ) || 0
            ) + 1
          );
        }
      );

      return [
        ...map.entries(),
      ].sort(
        (
          a,
          b
        ) =>
          b[1] -
          a[1]
      );
    }, [
      students,
    ]);

  /* ==========================================================
     WEEKLY TIMETABLE WORKLOAD
  ========================================================== */

  const weekdayWorkload =
    useMemo(() => {
      const result =
        [
          {
            name:
              "Monday",
            minutes:
              0,
          },
          {
            name:
              "Tuesday",
            minutes:
              0,
          },
          {
            name:
              "Wednesday",
            minutes:
              0,
          },
          {
            name:
              "Thursday",
            minutes:
              0,
          },
          {
            name:
              "Friday",
            minutes:
              0,
          },
          {
            name:
              "Saturday",
            minutes:
              0,
          },
          {
            name:
              "Sunday",
            minutes:
              0,
          },
        ];

      timetable.forEach(
        (
          entry
        ) => {
          const day =
            getDayName(
              entry?.dayOfWeek
            );

          const target =
            result.find(
              (
                item
              ) =>
                item.name ===
                day
            );

          if (target) {
            target.minutes +=
              getDurationMinutes(
                entry
              );
          }
        }
      );

      return result;
    }, [
      timetable,
    ]);

  const busiestDay =
    [
      ...weekdayWorkload,
    ].sort(
      (
        a,
        b
      ) =>
        b.minutes -
        a.minutes
    )[0];

  const maxDayMinutes =
    Math.max(
      ...weekdayWorkload.map(
        (
          item
        ) =>
          item.minutes
      ),
      1
    );

  /* ==========================================================
     COURSE HEALTH
  ========================================================== */

  const participationRate =
    students.length >
      0 &&
    assignments.length >
      0 &&
    totalAssignmentSubmissions >
      0
      ? Math.min(
          100,
          Math.round(
            (
              totalAssignmentSubmissions /
              (
                students.length *
                assignments.length
              )
            ) *
              100
          )
        )
      : 0;

  const courseHealth =
    attendancePercentage >=
      75 &&
    (
      gradingRate >=
        75 ||
      totalAssignmentSubmissions ===
        0
    )
      ? "Healthy"
      : attendancePercentage >=
            60 ||
          gradingRate >=
            60
      ? "Needs Attention"
      : "Critical";

  const attentionItems =
    useMemo(() => {
      const items =
        [];

      if (
        attendance.length >
          0 &&
        attendancePercentage <
          75
      ) {
        items.push({
          type:
            "Attendance",
          title:
            "Attendance needs attention",
          description:
            `Current attendance is ${attendancePercentage}% today.`,
          tone:
            "amber",
        });
      }

      if (
        pendingGrading >
        0
      ) {
        items.push({
          type:
            "Grading",
          title:
            "Pending submissions",
          description:
            `${pendingGrading} submissions are still awaiting grading.`,
          tone:
            "blue",
        });
      }

      if (
        examsAwaitingResults.length >
        0
      ) {
        items.push({
          type:
            "Results",
          title:
            "Exam results pending",
          description:
            `${examsAwaitingResults.length} completed exams have no result entries.`,
          tone:
            "red",
        });
      }

      if (
        upcomingAssignments.length >
        0 &&
        getDaysUntil(
          upcomingAssignments[0]
            ?.dueDate
        ) <=
          2
      ) {
        items.push({
          type:
            "Deadline",
          title:
            "Assignment deadline nearby",
          description:
            `${upcomingAssignments[0]?.title || "An assignment"} is due soon.`,
          tone:
            "violet",
        });
      }

      return items;
    }, [
      attendance,
      attendancePercentage,
      pendingGrading,
      examsAwaitingResults.length,
      upcomingAssignments,
    ]);

  /* ==========================================================
     FIRST UPCOMING
  ========================================================== */

  const nextAssignment =
    upcomingAssignments[0] ||
    null;

  const nextExam =
    upcomingExams[0] ||
    null;

  /* ==========================================================
     LOADING / ERROR
  ========================================================== */

  if (loading) {
    return (
      <CourseDetailsSkeleton />
    );
  }

  if (
    error ||
    !course
  ) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">

        <div className="mx-auto max-w-3xl">

          <button
            type="button"
            onClick={() =>
              navigate(
                "/faculty/courses"
              )
            }
            className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600"
          >

            <ArrowLeft
              size={18}
            />

            Back to My Courses

          </button>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">

            <div className="flex gap-3">

              <AlertCircle
                size={22}
                className="mt-0.5 shrink-0"
              />

              <div>

                <h2 className="font-bold">
                  Unable to load course
                </h2>

                <p className="mt-1 text-sm leading-6">
                  {
                    error ||
                    "Course information is unavailable."
                  }
                </p>

                <button
                  type="button"
                  onClick={() =>
                    loadCourseDetails(
                      true
                    )
                  }
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
                >

                  <RefreshCw
                    size={16}
                  />

                  Try Again

                </button>

              </div>

            </div>

          </div>

        </div>

      </div>
    );
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">

        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/faculty/courses"
                )
              }
              className="inline-flex w-fit items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600"
            >

              <ArrowLeft
                size={18}
              />

              My Courses

            </button>

            <div className="flex flex-wrap gap-2">

              <button
                type="button"
                onClick={() =>
                  loadCourseDetails(
                    true
                  )
                }
                disabled={
                  refreshing
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
              >

                <RefreshCw
                  size={17}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}

              </button>

              <Link
                to="/faculty/students"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
              >

                <Users
                  size={17}
                />

                Students

              </Link>

            </div>

          </div>

        </div>

      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* ====================================================
            HERO
        ==================================================== */}

        <section className="relative overflow-hidden rounded-3xl bg-indigo-600 p-6 text-white shadow-lg sm:p-8">

          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />

          <div className="absolute -bottom-24 right-20 h-60 w-60 rounded-full bg-white/5" />

          <div className="relative grid gap-8 xl:grid-cols-[1fr_auto] xl:items-center">

            <div>

              <div className="flex flex-wrap items-center gap-2">

                <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                  {courseCode}
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">
                  {courseType}
                </span>

                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    courseHealth ===
                    "Healthy"
                      ? "bg-green-400/20 text-green-100"
                      : courseHealth ===
                        "Needs Attention"
                      ? "bg-amber-400/20 text-amber-100"
                      : "bg-red-400/20 text-red-100"
                  }`}
                >
                  {courseHealth}
                </span>

              </div>

              <h1 className="mt-4 text-2xl font-bold sm:text-3xl lg:text-4xl">
                {courseName}
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-indigo-100 sm:text-base">

                {courseDescription ||
                  "Complete faculty workspace for managing students, attendance, assignments, examinations and teaching schedules."}

              </p>

              <div className="mt-5 flex flex-wrap gap-3">

                <HeroTag
                  icon={
                    <GraduationCap
                      size={14}
                    />
                  }
                  text={`Semester ${semester}`}
                />

                <HeroTag
                  icon={
                    <Award size={14} />
                  }
                  text={`Credits ${credits}`}
                />

                <HeroTag
                  icon={
                    <BookOpen
                      size={14}
                    />
                  }
                  text={
                    departmentName
                  }
                />

              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              <HeroMetric
                value={
                  students.length
                }
                label="Students"
              />

              <HeroMetric
                value={
                  assignments.length
                }
                label="Assignments"
              />

              <HeroMetric
                value={
                  exams.length
                }
                label="Exams"
              />

              <HeroMetric
                value={
                  timetable.length
                }
                label="Classes"
              />

            </div>

          </div>

        </section>

        {/* ====================================================
            KPI CARDS
        ==================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <KpiCard
            icon={
              <Users size={21} />
            }
            label="Enrolled Students"
            value={
              students.length
            }
            description="Students linked to this course"
          />

          <KpiCard
            icon={
              <UserCheck
                size={21}
              />
            }
            label="Today's Attendance"
            value={
              attendanceLoading
                ? "..."
                : attendance.length
                ? `${attendancePercentage}%`
                : "—"
            }
            description={
              attendance.length
                ? `${presentCount} present · ${absentCount} absent`
                : "No attendance data"
            }
            type="green"
          />

          <KpiCard
            icon={
              <ListChecks
                size={21}
              />
            }
            label="Grading Rate"
            value={`${gradingRate}%`}
            description={`${pendingGrading} pending submissions`}
            type="purple"
          />

          <KpiCard
            icon={
              <Clock3 size={21} />
            }
            label="Teaching Hours"
            value={`${totalTeachingHours.toFixed(
              1
            )}h`}
            description={`${uniqueRooms} rooms · ${timetable.length} sessions`}
            type="amber"
          />

        </section>

        {/* ====================================================
            QUICK MODULES
        ==================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <QuickModule
            title="Attendance"
            description="Mark and review student attendance"
            icon={
              <UserCheck
                size={22}
              />
            }
            type="indigo"
            to="/faculty/attendance"
          />

          <QuickModule
            title="Assignments"
            description="Manage assessments and submissions"
            icon={
              <FileText
                size={22}
              />
            }
            type="green"
            to="/faculty/assignments"
          />

          <QuickModule
            title="Examinations"
            description="Manage exams and student results"
            icon={
              <GraduationCap
                size={22}
              />
            }
            type="amber"
            to="/faculty/examinations"
          />

          <QuickModule
            title="Timetable"
            description="View your teaching schedule"
            icon={
              <CalendarDays
                size={22}
              />
            }
            type="purple"
            to="/faculty/timetable"
          />

        </section>

        {/* ====================================================
            ATTENTION CENTER
        ==================================================== */}

        {attentionItems.length >
          0 && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">

                <CircleAlert
                  size={21}
                />

              </div>

              <div>

                <h2 className="font-bold text-slate-900">
                  Attention Center
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Important course activities that may require action.
                </p>

              </div>

            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">

              {attentionItems.map(
                (
                  item,
                  index
                ) => {

                  const toneStyles = {
                    amber:
                      "border-amber-200 bg-amber-50 text-amber-700",
                    blue:
                      "border-blue-200 bg-blue-50 text-blue-700",
                    red:
                      "border-red-200 bg-red-50 text-red-700",
                    violet:
                      "border-violet-200 bg-violet-50 text-violet-700",
                  };

                  return (
                    <div
                      key={`${item.type}-${index}`}
                      className={`rounded-xl border p-4 ${
                        toneStyles[
                          item.tone
                        ] ||
                        toneStyles.amber
                      }`}
                    >

                      <div className="flex items-start gap-3">

                        <AlertTriangle
                          size={18}
                          className="mt-0.5 shrink-0"
                        />

                        <div>

                          <p className="font-bold">
                            {item.title}
                          </p>

                          <p className="mt-1 text-xs leading-5 opacity-80">
                            {
                              item.description
                            }
                          </p>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          </section>
        )}

        {/* ====================================================
            ATTENDANCE + ASSESSMENT ANALYTICS
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

              <BarChart3
                size={22}
              />

            </div>

            <div>

              <h2 className="text-xl font-bold">
                Course Analytics
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Academic activity and workload snapshot.
              </p>

            </div>

          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">

            {/* ATTENDANCE */}

            <AnalyticsPanel
              title="Attendance Health"
              value={
                attendance.length
                  ? `${attendancePercentage}%`
                  : "—"
              }
              icon={
                <UserCheck
                  size={22}
                />
              }
              tone="green"
            >

              <ProgressBar
                value={
                  attendancePercentage
                }
                tone={
                  attendancePercentage >=
                  75
                    ? "green"
                    : attendancePercentage >=
                      60
                    ? "amber"
                    : "red"
                }
              />

              <div className="mt-4 grid grid-cols-3 gap-3">

                <StatBox
                  label="Present"
                  value={
                    presentCount
                  }
                />

                <StatBox
                  label="Absent"
                  value={
                    absentCount
                  }
                />

                <StatBox
                  label="Other"
                  value={
                    otherAttendanceCount
                  }
                />

              </div>

              <div className="mt-4 flex items-center justify-between text-xs">

                <span className="text-slate-400">
                  Today's records
                </span>

                <span className="font-bold text-slate-700">
                  {
                    totalAttendanceRecords
                  }
                </span>

              </div>

            </AnalyticsPanel>

            {/* GRADING */}

            <AnalyticsPanel
              title="Assessment Progress"
              value={`${gradingRate}%`}
              icon={
                <Target size={22} />
              }
              tone="purple"
            >

              <ProgressBar
                value={
                  gradingRate
                }
                tone="purple"
              />

              <div className="mt-4 grid grid-cols-3 gap-3">

                <StatBox
                  label="Assignments"
                  value={
                    assignments.length
                  }
                />

                <StatBox
                  label="Submitted"
                  value={
                    totalAssignmentSubmissions
                  }
                />

                <StatBox
                  label="Pending"
                  value={
                    pendingGrading
                  }
                />

              </div>

              <div className="mt-4 flex items-center justify-between text-xs">

                <span className="text-slate-400">
                  Graded submissions
                </span>

                <span className="font-bold text-slate-700">
                  {
                    gradedSubmissions
                  }
                </span>

              </div>

            </AnalyticsPanel>

          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <AnalyticsSmallCard
              icon={
                <Users size={18} />
              }
              label="Participation"
              value={`${participationRate}%`}
              description="Estimated assignment activity"
            />

            <AnalyticsSmallCard
              icon={
                <CheckCircle2
                  size={18}
                />
              }
              label="Exam Results"
              value={
                totalExamResults
              }
              description="Result entries recorded"
            />

            <AnalyticsSmallCard
              icon={
                <CalendarDays
                  size={18}
                />
              }
              label="Upcoming Exams"
              value={
                upcomingExams.length
              }
              description="Future examinations"
            />

            <AnalyticsSmallCard
              icon={
                <Layers3 size={18} />
              }
              label="Result Coverage"
              value={`${examResultCoverage}%`}
              description="Completed exams with results"
            />

          </div>

        </section>

        {/* ====================================================
            STUDENT DISTRIBUTION
        ==================================================== */}

        <section className="mt-8 grid gap-6 lg:grid-cols-2">

          <DistributionPanel
            title="Batch Distribution"
            subtitle="Student count by batch"
            icon={
              <Users size={21} />
            }
            data={
              batchDistribution
            }
            total={
              students.length
            }
            labelPrefix="Batch "
            emptyLabel="No batch data available."
          />

          <DistributionPanel
            title="Division Distribution"
            subtitle="Student count by division"
            icon={
              <Layers3
                size={21}
              />
            }
            data={
              divisionDistribution
            }
            total={
              students.length
            }
            labelPrefix=""
            emptyLabel="No division data available."
          />

        </section>

        {/* ====================================================
            UPCOMING HIGHLIGHTS
        ==================================================== */}

        <section className="mt-8 grid gap-6 lg:grid-cols-2">

          <HighlightPanel
            title="Next Assignment"
            icon={
              <ClipboardList
                size={21}
              />
            }
            item={
              nextAssignment
            }
            type="assignment"
          />

          <HighlightPanel
            title="Next Examination"
            icon={
              <GraduationCap
                size={21}
              />
            }
            item={
              nextExam
            }
            type="exam"
          />

        </section>

        {/* ====================================================
            ASSIGNMENTS
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <SectionHeader
            icon={
              <FileText
                size={21}
              />
            }
            title="Course Assignments"
            subtitle="Assignments linked with this course."
            count={
              assignments.length
            }
            countClass="bg-green-50 text-green-700"
            linkText="Manage"
            linkTo="/faculty/assignments"
          />

          {assignments.length ===
          0 ? (

            <EmptySection
              icon={
                <FileText
                  size={28}
                />
              }
              title="No assignments"
              text="No assignments are currently linked with this course."
            />

          ) : (

            <div className="mt-5 grid gap-4 md:grid-cols-2">

              {assignments.map(
                (
                  assignment
                ) => (
                  <AssignmentCard
                    key={
                      assignment.id
                    }
                    assignment={
                      assignment
                    }
                  />
                )
              )}

            </div>

          )}

        </section>

        {/* ====================================================
            EXAMINATIONS
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <SectionHeader
            icon={
              <GraduationCap
                size={21}
              />
            }
            title="Course Examinations"
            subtitle="Examinations associated with this course."
            count={
              exams.length
            }
            countClass="bg-amber-50 text-amber-700"
            linkText="Manage"
            linkTo="/faculty/examinations"
          />

          {exams.length ===
          0 ? (

            <EmptySection
              icon={
                <GraduationCap
                  size={28}
                />
              }
              title="No examinations"
              text="No examinations are currently linked with this course."
            />

          ) : (

            <div className="mt-5 grid gap-4 md:grid-cols-2">

              {exams.map(
                (
                  exam
                ) => (
                  <ExamCard
                    key={
                      exam.id
                    }
                    exam={
                      exam
                    }
                  />
                )
              )}

            </div>

          )}

        </section>

        {/* ====================================================
            STUDENTS
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-4">

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <Users
                    size={21}
                    className="text-indigo-600"
                  />

                  <h2 className="text-xl font-bold">
                    Enrolled Students
                  </h2>

                </div>

                <p className="mt-1 text-sm text-slate-500">

                  Showing{" "}
                  <span className="font-bold text-slate-700">
                    {
                      filteredStudents.length
                    }
                  </span>
                  {" "}
                  of{" "}
                  <span className="font-bold text-slate-700">
                    {
                      students.length
                    }
                  </span>
                  {" "}
                  students.

                </p>

              </div>

              <div className="flex flex-wrap items-center gap-2">

                <button
                  type="button"
                  onClick={() =>
                    setStudentView(
                      "table"
                    )
                  }
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                    studentView ===
                    "table"
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  Table
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setStudentView(
                      "cards"
                    )
                  }
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                    studentView ===
                    "cards"
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  Cards
                </button>

                <Link
                  to="/faculty/students"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-indigo-100 hover:text-indigo-700"
                >
                  All Students
                  <ArrowRight
                    size={14}
                  />
                </Link>

              </div>

            </div>

            {/* SEARCH */}

            <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">

              <div className="relative">

                <Search
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={
                    studentSearch
                  }
                  onChange={(
                    event
                  ) =>
                    setStudentSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search student, enrollment, email..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />

                {studentSearch && (
                  <button
                    type="button"
                    onClick={() =>
                      setStudentSearch(
                        ""
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"
                  >
                    <X
                      size={15}
                    />
                  </button>
                )}

              </div>

              <select
                value={
                  studentFilter
                }
                onChange={(
                  event
                ) =>
                  setStudentFilter(
                    event.target
                      .value
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white"
              >

                <option value="ALL">
                  All Students
                </option>

                <option value="BATCH_1">
                  Batch 1
                </option>

                <option value="BATCH_2">
                  Batch 2
                </option>

                <option value="DIV_A">
                  Division A
                </option>

                <option value="DIV_B">
                  Division B
                </option>

              </select>

              <select
                value={
                  studentSort
                }
                onChange={(
                  event
                ) =>
                  setStudentSort(
                    event.target
                      .value
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white"
              >

                <option value="name">
                  Sort by Name
                </option>

                <option value="enrollment">
                  Sort by Enrollment
                </option>

                <option value="batch">
                  Sort by Batch
                </option>

              </select>

            </div>

          </div>

          {filteredStudents.length ===
          0 ? (

            <EmptySection
              icon={
                <Users
                  size={28}
                />
              }
              title="No students found"
              text="No students match the current search or filter."
            />

          ) : studentView ===
            "table" ? (

            <StudentTable
              students={
                filteredStudents
              }
            />

          ) : (

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

              {filteredStudents.map(
                (
                  student
                ) => (
                  <StudentCard
                    key={
                      student.id ||
                      student.userId ||
                      getStudentEnrollment(
                        student
                      )
                    }
                    student={
                      student
                    }
                  />
                )
              )}

            </div>

          )}

        </section>

        {/* ====================================================
            TIMETABLE
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <SectionHeader
            icon={
              <CalendarDays
                size={21}
              />
            }
            title="Course Timetable"
            subtitle="Scheduled teaching sessions for this course."
            count={
              timetable.length
            }
            countClass="bg-violet-50 text-violet-700"
            linkText="View Timetable"
            linkTo="/faculty/timetable"
          />

          {timetable.length ===
          0 ? (

            <EmptySection
              icon={
                <CalendarDays
                  size={28}
                />
              }
              title="No timetable entries"
              text="No classes are currently scheduled for this course."
            />

          ) : (

            <>

              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                {[
                  ...timetable,
                ]
                  .sort(
                    (
                      a,
                      b
                    ) => {
                      const dayDiff =
                        Number(
                          a?.dayOfWeek ??
                            0
                        ) -
                        Number(
                          b?.dayOfWeek ??
                            0
                        );

                      if (
                        dayDiff !==
                        0
                      ) {
                        return dayDiff;
                      }

                      return (
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
                    }
                  )
                  .map(
                    (
                      entry
                    ) => (
                      <TimetableCard
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

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
                    <Activity
                      size={19}
                    />
                  </div>

                  <div>

                    <h3 className="font-bold text-slate-800">
                      Weekly Workload
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Teaching hours by day.
                    </p>

                  </div>

                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">

                  {weekdayWorkload.map(
                    (
                      item
                    ) => {

                      const percentage =
                        Math.round(
                          (
                            item.minutes /
                            maxDayMinutes
                          ) *
                            100
                        );

                      return (
                        <div
                          key={
                            item.name
                          }
                          className="rounded-xl bg-white p-3"
                        >

                          <div className="flex items-center justify-between gap-2">

                            <span className="text-[10px] font-bold text-slate-500">
                              {
                                item.name.slice(
                                  0,
                                  3
                                )
                              }
                            </span>

                            <span className="text-[10px] font-bold text-violet-600">
                              {
                                item.minutes >
                                0
                                  ? formatDuration(
                                      item.minutes
                                    )
                                  : "—"
                              }
                            </span>

                          </div>

                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">

                            <div
                              className="h-full rounded-full bg-violet-500 transition-all"
                              style={{
                                width: `${percentage}%`,
                              }}
                            />

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

                {busiestDay &&
                  busiestDay.minutes >
                    0 && (
                    <p className="mt-4 text-xs text-slate-500">

                      Busiest day:
                      {" "}
                      <span className="font-bold text-slate-700">
                        {
                          busiestDay.name
                        }
                      </span>
                      {" "}
                      with
                      {" "}
                      <span className="font-bold text-violet-600">
                        {
                          formatDuration(
                            busiestDay.minutes
                          )
                        }
                      </span>
                      {" "}
                      of scheduled teaching.

                    </p>
                  )}

              </div>

            </>

          )}

        </section>

        {/* ====================================================
            UPCOMING
        ==================================================== */}

        <section className="mt-8 grid gap-6 lg:grid-cols-2">

          <UpcomingPanel
            title="Upcoming Assignments"
            icon={
              <ClipboardList
                size={21}
              />
            }
            items={
              upcomingAssignments
            }
            type="assignment"
          />

          <UpcomingPanel
            title="Upcoming Examinations"
            icon={
              <GraduationCap
                size={21}
              />
            }
            items={
              upcomingExams
            }
            type="exam"
          />

        </section>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-5 text-green-700">

          <div className="flex items-start gap-3">

            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div>

              <p className="font-bold">
                Course management workspace ready
              </p>

              <p className="mt-1 text-sm leading-6">
                Student data, assessments, examinations, attendance and timetable information are connected through the existing faculty APIs.
              </p>

            </div>

          </div>

        </div>

      </main>

    </div>
  );
}

/* ============================================================
   HERO TAG
============================================================ */

function HeroTag({
  icon,
  text,
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">
      {icon}
      {text}
    </span>
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
    green:
      "bg-green-50 text-green-600",
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
   QUICK MODULE
============================================================ */

function QuickModule({
  title,
  description,
  icon,
  type,
  to,
}) {
  const styles = {
    indigo:
      "bg-indigo-50 text-indigo-600",
    green:
      "bg-green-50 text-green-600",
    amber:
      "bg-amber-50 text-amber-600",
    purple:
      "bg-purple-50 text-purple-600",
  };

  return (
    <Link
      to={to}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-md"
    >

      <div className="flex items-start justify-between">

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles[type]}`}
        >
          {icon}
        </div>

        <ChevronRight
          size={18}
          className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-600"
        />

      </div>

      <h3 className="mt-4 font-bold text-slate-800">
        {title}
      </h3>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>

    </Link>
  );
}

/* ============================================================
   ANALYTICS PANEL
============================================================ */

function AnalyticsPanel({
  title,
  value,
  icon,
  tone = "indigo",
  children,
}) {
  const toneStyles = {
    indigo:
      "bg-indigo-50 text-indigo-600",
    green:
      "bg-green-50 text-green-600",
    purple:
      "bg-purple-50 text-purple-600",
    amber:
      "bg-amber-50 text-amber-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

      <div className="flex items-center justify-between gap-3">

        <div>

          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {title}
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-800">
            {value}
          </p>

        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${toneStyles[tone]}`}
        >
          {icon}
        </div>

      </div>

      <div className="mt-5">
        {children}
      </div>

    </div>
  );
}

/* ============================================================
   PROGRESS BAR
============================================================ */

function ProgressBar({
  value,
  tone = "indigo",
}) {
  const styles = {
    indigo:
      "bg-indigo-600",
    green:
      "bg-green-500",
    amber:
      "bg-amber-500",
    red:
      "bg-red-500",
    purple:
      "bg-purple-600",
  };

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
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">

      <div
        className={`h-full rounded-full transition-all duration-500 ${styles[tone]}`}
        style={{
          width: `${safeValue}%`,
        }}
      />

    </div>
  );
}

/* ============================================================
   STAT BOX
============================================================ */

function StatBox({
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-white p-3 text-center">

      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-800">
        {value}
      </p>

    </div>
  );
}

/* ============================================================
   ANALYTICS SMALL CARD
============================================================ */

function AnalyticsSmallCard({
  icon,
  label,
  value,
  description,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

      <div className="flex items-center justify-between gap-3">

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
          {icon}
        </div>

        <p className="text-xl font-bold text-slate-800">
          {value}
        </p>

      </div>

      <p className="mt-3 text-sm font-semibold text-slate-700">
        {label}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>

    </div>
  );
}

/* ============================================================
   DISTRIBUTION PANEL
============================================================ */

function DistributionPanel({
  title,
  subtitle,
  icon,
  data,
  total,
  labelPrefix = "",
  emptyLabel,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

      <div className="flex items-center gap-3">

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          {icon}
        </div>

        <div>

          <h2 className="font-bold text-slate-900">
            {title}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {subtitle}
          </p>

        </div>

      </div>

      {data.length ===
      0 ? (

        <p className="mt-5 text-sm text-slate-500">
          {emptyLabel}
        </p>

      ) : (

        <div className="mt-5 space-y-4">

          {data.map(
            (
              [
                key,
                count,
              ]
            ) => {

              const percentage =
                total >
                0
                  ? Math.round(
                      (
                        count /
                        total
                      ) *
                        100
                    )
                  : 0;

              return (
                <div
                  key={
                    key
                  }
                >

                  <div className="flex items-center justify-between gap-3">

                    <span className="text-sm font-semibold text-slate-700">
                      {
                        labelPrefix
                      }
                      {
                        key
                      }
                    </span>

                    <span className="text-xs font-bold text-slate-500">
                      {
                        count
                      }
                      {" "}
                      (
                      {
                        percentage
                      }%)
                    </span>

                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">

                    <div
                      className="h-full rounded-full bg-indigo-600"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />

                  </div>

                </div>
              );
            }
          )}

        </div>

      )}

    </section>
  );
}

/* ============================================================
   HIGHLIGHT PANEL
============================================================ */

function HighlightPanel({
  title,
  icon,
  item,
  type,
}) {
  if (!item) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            {icon}
          </div>

          <div>

            <h2 className="font-bold text-slate-900">
              {title}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              No upcoming item.
            </p>

          </div>

        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
          Nothing is scheduled next.
        </div>

      </section>
    );
  }

  const date =
    type ===
    "assignment"
      ? item.dueDate
      : item.examDate;

  const days =
    getDaysUntil(date);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

      <div className="flex items-center justify-between gap-3">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            {icon}
          </div>

          <div>

            <h2 className="font-bold text-slate-900">
              {title}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Next scheduled activity.
            </p>

          </div>

        </div>

        {days !==
          null && (
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
              days <= 2
                ? "bg-red-50 text-red-600"
                : days <= 7
                ? "bg-amber-50 text-amber-700"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {
              getStatusText(
                date
              )
            }
          </span>
        )}

      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-5">

        <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
          {
            getCourseCode(
              item
            )
          }
        </p>

        <h3 className="mt-2 text-lg font-bold text-slate-800">
          {
            item.title ||
            item.name ||
            "Upcoming Item"
          }
        </h3>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">

          <span className="rounded-full bg-white px-3 py-1.5">
            {type ===
            "assignment"
              ? `Due ${formatDate(
                  date
                )}`
              : formatDateTime(
                  date
                )}
          </span>

          {type ===
            "assignment" &&
            item?.totalMarks !=
              null && (
              <span className="rounded-full bg-white px-3 py-1.5">
                {
                  item.totalMarks
                }{" "}
                marks
              </span>
            )}

          {type ===
            "exam" &&
            item?.maxMarks !=
              null && (
              <span className="rounded-full bg-white px-3 py-1.5">
                Max{" "}
                {
                  item.maxMarks
                }
                {" "}
                marks
              </span>
            )}

        </div>

      </div>

    </section>
  );
}

/* ============================================================
   SECTION HEADER
============================================================ */

function SectionHeader({
  icon,
  title,
  subtitle,
  count,
  countClass,
  linkText,
  linkTo,
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

      <div>

        <div className="flex items-center gap-2">

          <span className="text-indigo-600">
            {icon}
          </span>

          <h2 className="text-xl font-bold">
            {title}
          </h2>

        </div>

        <p className="mt-1 text-sm text-slate-500">
          {subtitle}
        </p>

      </div>

      <div className="flex items-center gap-3">

        <span
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
            countClass ||
            "bg-slate-100 text-slate-600"
          }`}
        >
          {count}
          {" "}
          {count ===
          1
            ? "item"
            : "items"}
        </span>

        {linkTo && (
          <Link
            to={linkTo}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
          >
            {linkText}
            <ArrowRight
              size={14}
            />
          </Link>
        )}

      </div>

    </div>
  );
}

/* ============================================================
   ASSIGNMENT CARD
============================================================ */

function AssignmentCard({
  assignment,
}) {
  const dueDays =
    getDaysUntil(
      assignment?.dueDate
    );

  const submissions =
    getAssignmentSubmissions(
      assignment
    );

  const pending =
    getPendingGrading(
      assignment
    );

  const graded =
    Math.max(
      submissions -
        pending,
      0
    );

  const gradeRate =
    submissions >
      0
      ? Math.round(
          (
            graded /
            submissions
          ) *
            100
        )
      : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-indigo-200 hover:bg-white hover:shadow-sm">

      <div className="flex items-start justify-between gap-3">

        <div className="flex min-w-0 items-start gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

            <FileText
              size={19}
            />

          </div>

          <div className="min-w-0">

            <h3 className="break-words font-bold text-slate-800">
              {
                assignment?.title ||
                assignment?.name ||
                "Assignment"
              }
            </h3>

            <p className="mt-1 text-xs font-semibold text-indigo-600">
              {
                getCourseCode(
                  assignment
                )
              }
            </p>

          </div>

        </div>

        {dueDays !==
          null && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
              dueDays <=
                2
                ? "bg-red-50 text-red-600"
                : dueDays <=
                  7
                ? "bg-amber-50 text-amber-700"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {
              getStatusText(
                assignment?.dueDate
              )
            }
          </span>
        )}

      </div>

      {assignment?.description && (
        <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">
          {
            assignment.description
          }
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">

        {assignment?.dueDate && (
          <span className="rounded-full bg-white px-3 py-1.5">
            Due{" "}
            {
              formatDate(
                assignment.dueDate
              )
            }
          </span>
        )}

        {assignment?.totalMarks !=
          null && (
          <span className="rounded-full bg-white px-3 py-1.5">
            {
              assignment.totalMarks
            }{" "}
            marks
          </span>
        )}

        <span className="rounded-full bg-white px-3 py-1.5">
          {
            submissions
          }{" "}
          submissions
        </span>

      </div>

      <div className="mt-4">

        <div className="flex items-center justify-between text-[11px]">

          <span className="font-semibold text-slate-400">
            Grading progress
          </span>

          <span className="font-bold text-indigo-600">
            {gradeRate}%
          </span>

        </div>

        <ProgressBar
          value={
            gradeRate
          }
          tone="indigo"
        />

      </div>

    </div>
  );
}

/* ============================================================
   EXAM CARD
============================================================ */

function ExamCard({
  exam,
}) {
  const days =
    getDaysUntil(
      exam?.examDate
    );

  const resultCount =
    getExamResultCount(
      exam
    );

  const past =
    days !==
      null &&
    days <
      0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-amber-200 hover:bg-white hover:shadow-sm">

      <div className="flex items-start justify-between gap-3">

        <div className="flex items-start gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">

            <GraduationCap
              size={19}
            />

          </div>

          <div className="min-w-0">

            <h3 className="font-bold text-slate-800">
              {
                exam?.title ||
                exam?.name ||
                exam?.examName ||
                "Examination"
              }
            </h3>

            <p className="mt-1 text-xs font-semibold text-amber-600">
              {
                exam?.examType ||
                exam?.type ||
                "Exam"
              }
            </p>

          </div>

        </div>

        {days !==
          null && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
              past
                ? "bg-slate-100 text-slate-600"
                : days <=
                  3
                ? "bg-red-50 text-red-600"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {
              past
                ? "Completed"
                : getStatusText(
                    exam?.examDate
                  )
            }
          </span>
        )}

      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">

        {exam?.examDate && (
          <span className="rounded-full bg-white px-3 py-1.5">
            {
              formatDateTime(
                exam.examDate
              )
            }
          </span>
        )}

        {exam?.maxMarks !=
          null && (
          <span className="rounded-full bg-white px-3 py-1.5">
            Max{" "}
            {
              exam.maxMarks
            }
          </span>
        )}

        <span className="rounded-full bg-white px-3 py-1.5">
          Results{" "}
          {
            resultCount
          }
        </span>

      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-3">

        <span className="text-xs font-semibold text-slate-500">
          Result status
        </span>

        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
            resultCount >
            0
              ? "bg-green-50 text-green-700"
              : past
              ? "bg-amber-50 text-amber-700"
              : "bg-blue-50 text-blue-700"
          }`}
        >
          {resultCount >
          0
            ? "Results Available"
            : past
            ? "Awaiting Results"
            : "Scheduled"}
        </span>

      </div>

    </div>
  );
}

/* ============================================================
   STUDENT TABLE
============================================================ */

function StudentTable({
  students,
}) {
  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">

      <table className="min-w-full">

        <thead>

          <tr className="border-b border-slate-200 bg-slate-50 text-left">

            <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Student
            </th>

            <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Enrollment
            </th>

            <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Batch
            </th>

            <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Division
            </th>

            <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Email
            </th>

          </tr>

        </thead>

        <tbody className="divide-y divide-slate-100">

          {students.map(
            (
              student
            ) => {

              const name =
                getStudentName(
                  student
                );

              return (
                <tr
                  key={
                    student?.id ||
                    student?.userId ||
                    getStudentEnrollment(
                      student
                    )
                  }
                  className="transition hover:bg-slate-50"
                >

                  <td className="px-4 py-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-xs font-bold text-indigo-600">

                        {
                          getStudentInitials(
                            name
                          )
                        }

                      </div>

                      <div className="min-w-0">

                        <p className="truncate font-bold text-slate-800">
                          {name}
                        </p>

                      </div>

                    </div>

                  </td>

                  <td className="px-4 py-4 text-sm font-semibold text-slate-600">

                    {
                      getStudentEnrollment(
                        student
                      )
                    }

                  </td>

                  <td className="px-4 py-4 text-sm text-slate-600">

                    {
                      student?.batch ||
                      "—"
                    }

                  </td>

                  <td className="px-4 py-4 text-sm text-slate-600">

                    {
                      student?.division ||
                      "—"
                    }

                  </td>

                  <td className="px-4 py-4">

                    {getStudentEmail(
                      student
                    ) ? (
                      <a
                        href={`mailto:${getStudentEmail(
                          student
                        )}`}
                        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600"
                      >

                        <Mail
                          size={14}
                        />

                        {
                          getStudentEmail(
                            student
                          )
                        }

                      </a>
                    ) : (
                      <span className="text-sm text-slate-400">
                        —
                      </span>
                    )}

                  </td>

                </tr>
              );
            }
          )}

        </tbody>

      </table>

    </div>
  );
}

/* ============================================================
   STUDENT CARD
============================================================ */

function StudentCard({
  student,
}) {
  const name =
    getStudentName(
      student
    );

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-indigo-200 hover:bg-white hover:shadow-sm">

      <div className="flex items-start gap-3">

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 font-bold text-indigo-600">

          {
            getStudentInitials(
              name
            )
          }

        </div>

        <div className="min-w-0 flex-1">

          <h3 className="truncate font-bold text-slate-800">
            {name}
          </h3>

          <p className="mt-1 text-xs font-semibold text-indigo-600">
            {
              getStudentEnrollment(
                student
              )
            }
          </p>

        </div>

      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">

        <div className="rounded-xl bg-white p-3">

          <p className="text-[10px] font-semibold text-slate-400">
            Batch
          </p>

          <p className="mt-1 text-sm font-bold text-slate-700">
            {
              student?.batch ||
              "—"
            }
          </p>

        </div>

        <div className="rounded-xl bg-white p-3">

          <p className="text-[10px] font-semibold text-slate-400">
            Division
          </p>

          <p className="mt-1 text-sm font-bold text-slate-700">
            {
              student?.division ||
              "—"
            }
          </p>

        </div>

      </div>

      {getStudentEmail(
        student
      ) && (
        <a
          href={`mailto:${getStudentEmail(
            student
          )}`}
          className="mt-4 flex items-center gap-2 break-all text-xs text-slate-500 hover:text-indigo-600"
        >

          <Mail
            size={14}
          />

          {
            getStudentEmail(
              student
            )
          }

        </a>
      )}

    </div>
  );
}

/* ============================================================
   TIMETABLE CARD
============================================================ */

function TimetableCard({
  entry,
}) {
  const duration =
    getDurationMinutes(
      entry
    );

  const type =
    entry?.classType ||
    entry?.sessionType ||
    "Lecture";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-violet-200 hover:bg-white hover:shadow-sm">

      <div className="flex items-center justify-between gap-3">

        <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">

          {
            getDayName(
              entry?.dayOfWeek
            )
          }

        </span>

        <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-slate-500">

          {
            type
          }

        </span>

      </div>

      <div className="mt-4">

        <p className="text-lg font-bold text-slate-800">

          {
            formatTime(
              entry?.startTime
            )
          }
          {" "}
          -
          {" "}
          {
            formatTime(
              entry?.endTime
            )
          }

        </p>

        <p className="mt-1 text-xs text-slate-400">

          Duration
          {" "}
          {
            formatDuration(
              duration
            )
          }

        </p>

      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-500">

        <div className="flex items-center gap-2">

          <MapPin
            size={15}
          />

          {
            entry?.room ||
            entry?.roomNumber ||
            "Room not assigned"
          }

        </div>

        <div className="flex items-center gap-2">

          <Users
            size={15}
          />

          {entry?.batch
            ? `Batch ${entry.batch}`
            : "Common / All Batches"}

        </div>

      </div>

    </div>
  );
}

/* ============================================================
   UPCOMING PANEL
============================================================ */

function UpcomingPanel({
  title,
  icon,
  items,
  type,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

      <div className="flex items-center justify-between gap-3">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

            {icon}

          </div>

          <div>

            <h2 className="font-bold text-slate-900">
              {title}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Next scheduled items.
            </p>

          </div>

        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
          {
            items.length
          }
        </span>

      </div>

      {items.length ===
      0 ? (

        <div className="mt-5 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">

          No upcoming{" "}
          {type ===
          "assignment"
            ? "assignments"
            : "examinations"}.

        </div>

      ) : (

        <div className="mt-5 space-y-3">

          {items.map(
            (
              item
            ) => {

              const date =
                type ===
                "assignment"
                  ? item?.dueDate
                  : item?.examDate;

              return (
                <div
                  key={
                    item.id
                  }
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >

                  <div className="flex items-start justify-between gap-3">

                    <div className="min-w-0">

                      <p className="text-xs font-bold text-indigo-600">
                        {
                          getCourseCode(
                            item
                          )
                        }
                      </p>

                      <p className="mt-1 truncate font-semibold text-slate-800">
                        {
                          item.title ||
                          item.name ||
                          "Item"
                        }
                      </p>

                    </div>

                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500">

                      {
                        getStatusText(
                          date
                        )
                      }

                    </span>

                  </div>

                  <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">

                    <Clock3
                      size={14}
                    />

                    {
                      type ===
                      "assignment"
                        ? `Due ${formatDate(
                            date
                          )}`
                        : formatDateTime(
                            date
                          )
                    }

                  </p>

                </div>
              );
            }
          )}

        </div>

      )}

    </section>
  );
}

/* ============================================================
   EMPTY SECTION
============================================================ */

function EmptySection({
  icon,
  title,
  text,
}) {
  return (
    <div className="mt-5 rounded-2xl bg-slate-50 p-8 text-center">

      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">

        {icon}

      </div>

      <h3 className="mt-4 font-bold text-slate-800">
        {title}
      </h3>

      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
        {text}
      </p>

    </div>
  );
}

/* ============================================================
   SKELETON
============================================================ */

function CourseDetailsSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-slate-50 p-4 sm:p-6">

      <div className="mx-auto max-w-7xl">

        <div className="mb-6 h-5 w-32 rounded bg-slate-200" />

        <div className="h-60 rounded-3xl bg-slate-200" />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {[
            1,
            2,
            3,
            4,
          ].map(
            (
              item
            ) => (
              <div
                key={
                  item
                }
                className="h-28 rounded-2xl bg-slate-200"
              />
            )
          )}

        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {[
            1,
            2,
            3,
            4,
          ].map(
            (
              item
            ) => (
              <div
                key={
                  item
                }
                className="h-32 rounded-2xl bg-slate-200"
              />
            )
          )}

        </div>

        <div className="mt-8 h-96 rounded-2xl bg-slate-200" />

        <div className="mt-8 h-72 rounded-2xl bg-slate-200" />

        <div className="mt-8 h-80 rounded-2xl bg-slate-200" />

      </div>

    </div>
  );
}

export default FacultyCourseDetails;