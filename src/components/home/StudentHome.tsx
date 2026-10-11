import { courses } from "@/data/courses";
import { AiChat } from "./AiChat";
import { DesignStage } from "./DesignStage";
import { HomeHeader } from "./HomeHeader";
import { PlanetCarousel } from "./PlanetCarousel";
import { ScheduleStrip } from "./ScheduleStrip";
import { SceneBackground } from "./SceneBackground";

/** Màn Trang chủ học sinh — Figma "Khóa học 1" (109:42213). Thứ tự lớp giữ theo thứ tự layer trong Figma. */
export function StudentHome() {
  return (
    <DesignStage>
      <main className="relative size-full text-white">
        <SceneBackground />
        <PlanetCarousel courses={courses} />
        <AiChat />
        <HomeHeader />
        <ScheduleStrip />
      </main>
    </DesignStage>
  );
}
