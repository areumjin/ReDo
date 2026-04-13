import svgPaths from "../imports/svg-uhrfxg5ltt";

export function StatusBar() {
  return (
    <div
      className="relative shrink-0 w-full overflow-clip"
      style={{ height: 50 }}
    >
      {/* Notch */}
      <div className="absolute" style={{ height: 30, left: 96, top: -2, width: 183 }}>
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 183 30">
          <path d={svgPaths.pf91bfc0} fill="black" />
        </svg>
      </div>

      {/* Right Side — battery, wifi, signal */}
      <div className="absolute" style={{ height: 11.336, right: 14.67, top: 17.33, width: 66.661 }}>
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 66.6614 11.336">
          <path d={svgPaths.p21e39200} opacity="0.35" stroke="black" />
          <path d={svgPaths.p22185d80} fill="black" opacity="0.4" />
          <path d={svgPaths.p5ab6380} fill="black" />
          <path d={svgPaths.p2160c680} fill="black" />
          <path d={svgPaths.p36dac880} fill="black" />
        </svg>
      </div>

      {/* Time */}
      <div className="absolute" style={{ height: 21, left: 21, top: 12, width: 54 }}>
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 54 21">
          <path d={svgPaths.p24372f50} fill="black" />
          <path d={svgPaths.p3aa84e00} fill="black" />
          <path d={svgPaths.p2e6b3780} fill="black" />
          <path d={svgPaths.p12b0b900} fill="black" />
        </svg>
      </div>
    </div>
  );
}
