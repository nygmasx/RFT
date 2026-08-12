from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/images/rft-mark.png"
OUT = ROOT / "assets/images/brand"
OUT.mkdir(parents=True, exist_ok=True)

mark = Image.open(SOURCE).convert("RGBA")
bounds = mark.getbbox()
if not bounds:
    raise RuntimeError("The RFT mark is empty")
mark = mark.crop(bounds)

def fitted(size: int, padding: int) -> Image.Image:
    maximum = size - padding * 2
    ratio = min(maximum / mark.width, maximum / mark.height)
    return mark.resize((round(mark.width * ratio), round(mark.height * ratio)), Image.Resampling.LANCZOS)

def centered(canvas: Image.Image, subject: Image.Image) -> Image.Image:
    canvas.alpha_composite(subject, ((canvas.width - subject.width) // 2, (canvas.height - subject.height) // 2))
    return canvas

icon = centered(Image.new("RGBA", (1024, 1024), "#0A0A0A"), fitted(1024, 105))
icon.convert("RGB").save(OUT / "icon.png", optimize=True)

foreground = centered(Image.new("RGBA", (432, 432), (0, 0, 0, 0)), fitted(432, 70))
foreground.save(OUT / "android-foreground.png", optimize=True)

mono_subject = fitted(432, 70)
mono = Image.new("RGBA", mono_subject.size, (255, 255, 255, 0))
mono.putalpha(mono_subject.getchannel("A"))
centered(Image.new("RGBA", (432, 432), (0, 0, 0, 0)), mono).save(OUT / "android-monochrome.png", optimize=True)

splash = centered(Image.new("RGBA", (512, 512), (0, 0, 0, 0)), fitted(512, 72))
splash.save(OUT / "splash.png", optimize=True)

favicon = icon.resize((64, 64), Image.Resampling.LANCZOS)
favicon.save(OUT / "favicon.png", optimize=True)

print(f"Generated brand assets in {OUT}")
