from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
frame_dir = root / "media" / "video" / "tmp" / "gif-frames"
target = root / "media" / "video" / "crimson-nocturne-demo.gif"

frames = []
for frame_path in sorted(frame_dir.glob("frame-*.png")):
    frame = Image.open(frame_path).convert("P", palette=Image.ADAPTIVE)
    frames.append(frame)

if not frames:
    raise SystemExit("No GIF frames found.")

frames[0].save(
    target,
    save_all=True,
    append_images=frames[1:],
    duration=140,
    loop=0,
    optimize=False,
)
