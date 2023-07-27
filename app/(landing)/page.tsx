"use client"

import { LandingNavbar } from "@/components/landing-navbar";
import { LandingHero } from "@/components/landing-hero";
import { LandingContent } from "@/components/landing-content";

const LandingPage = () => {
  return (
    <div className="landing-page-container">
      {/* Blurry Gradient Background */}
      <div className="landing-page-bg"></div>

      <div className="h-full relative">
        <LandingNavbar />
        <LandingHero />
        <LandingContent />
      </div>

      {/* Add CSS for the gradient background */}
      <style jsx>{`
        .landing-page-container {
          position: relative;
          overflow: hidden;
          min-height: 100vh;
        }

        .landing-page-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: linear-gradient(
            45deg,
            rgba(93, 42, 192, 0.8),
            rgba(255, 64, 129, 0.8)
          );
          backdrop-filter: blur(10px); /* Adjust the blur amount as needed */
          z-index: 0; /* Place the background element behind other content */
        }

        /* Apply padding or margins as needed to avoid content overlapping with the background */
        .h-full {
          padding: 20px;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;