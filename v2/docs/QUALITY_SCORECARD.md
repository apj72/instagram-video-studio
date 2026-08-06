# VERSION 1 Studio — Quality Scorecard

## Gates

| Gate | Target | Current | Status |
|------|--------|---------|--------|
| TypeScript strict compile | 0 errors | 0 errors | PASS |
| V1 config import | All fields mapped | Implemented | UNTESTED |
| Deterministic render | Same seed+frame = same pixels | Clock + PRNG built | UNTESTED |
| Canvas 30fps preview | No frame drops at 1080x1920 | Basic loop running | UNTESTED |
| MP4 export | H.264 + AAC, fast-start | Not started | - |
| Undo/redo | All edits reversible | Not started | - |
| Project persistence | Save/load cycle | Not started | - |
| Accessibility | Keyboard nav, focus visible | Focus-visible on buttons | PARTIAL |

## Benchmarks

- Preview render: target <16ms per frame at 1080x1920
- Export encode: target <2x real-time (16s video in <32s)
- Project load: target <500ms for typical project
- Memory: target <200MB for typical session

## Known Issues

None tracked yet.
