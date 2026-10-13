// Dữ liệu mock cho dải "Lịch lớp" — độc lập với khóa học đang chọn trên carousel.

export type BadgeTheme = { circle: string; glow: string };

export type FeaturedSession = {
  id: string;
  title: string;
  detail: string;
  status: string;
  countdown: string;
  subjectImage: string;
  badge: BadgeTheme;
};

export type UpcomingSession = {
  id: string;
  subject: string;
  time: string;
  lesson: string;
  meta: string;
  subjectImage: string;
  badge: BadgeTheme;
};

export const scheduleHeading = {
  title: "LỊCH LỚP · ĐẢO DIGITAL ACADEMY",
  date: "Hôm nay · Thứ 4, 16/09",
};

export const featuredSession: FeaturedSession = {
  id: "en-unit-5",
  title: "Tiếng Anh · Unit 5: My Family",
  detail: "Hôm nay 19:00 – 19:45 · Cô Ngọc Anh · Phòng Sky 2",
  status: "SẮP DIỄN RA",
  countdown: "Bắt đầu sau 12 phút",
  subjectImage: "/home/schedule/subject-english.webp",
  badge: { circle: "/home/schedule/badge-circle-lg.svg", glow: "/home/schedule/badge-glow-lg.svg" },
};

export const upcomingSessions: UpcomingSession[] = [
  {
    id: "b1-04",
    subject: "Tiếng Anh B1",
    time: "Hôm nay · 20:00 – 20:45",
    lesson: "Tiết 04 · Relative Clauses",
    meta: "Thầy Minh Quân · còn 1g 12p",
    subjectImage: "/home/schedule/subject-english.webp",
    badge: { circle: "/home/schedule/badge-circle-1.svg", glow: "/home/schedule/badge-glow-1.svg" },
  },
  {
    id: "g7-05",
    subject: "Tiếng Anh lớp 7",
    time: "Ngày mai · 19:00 – 19:45",
    lesson: "Tiết 05 · Should / Shouldn't",
    meta: "Cô Thu Hà · còn 1 ngày",
    subjectImage: "/home/schedule/subject-english.webp",
    badge: { circle: "/home/schedule/badge-circle-2.svg", glow: "/home/schedule/badge-glow-2.svg" },
  },
  {
    id: "en-06",
    subject: "Tiếng Anh lớp 5",
    time: "Thứ 6 · 19:00 – 19:45",
    lesson: "Tiết 06 · Unit 5: Review & Games",
    meta: "Cô Ngọc Anh · còn 2 ngày",
    subjectImage: "/home/schedule/subject-english.webp",
    badge: { circle: "/home/schedule/badge-circle-3.svg", glow: "/home/schedule/badge-glow-1.svg" },
  },
];
