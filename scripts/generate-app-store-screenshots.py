from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "artifacts/ui-refresh"
STORE = ROOT / "assets/app-store"
OUT = STORE / "iphone-65"

WIDTH = 1242
HEIGHT = 2688
INK = "#070707"
BONE = "#F4F1EC"
RED = "#C8362D"
DEEP_RED = "#8E1F18"
GOLD = "#C9A24B"
DIM = "#9C968D"

FONT_BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_MONO = "/System/Library/Fonts/SFNSMono.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


def cover(image: Image.Image, size: tuple[int, int], focus_x: float = 0.5, focus_y: float = 0.5) -> Image.Image:
    src = image.convert("RGB")
    scale = max(size[0] / src.width, size[1] / src.height)
    resized = src.resize((round(src.width * scale), round(src.height * scale)), Image.Resampling.LANCZOS)
    left = round((resized.width - size[0]) * focus_x)
    top = round((resized.height - size[1]) * focus_y)
    return resized.crop((left, top, left + size[0], top + size[1]))


def gradient_background(top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    line = Image.new("RGB", (1, HEIGHT))
    pixels = line.load()
    for y in range(HEIGHT):
        t = y / max(HEIGHT - 1, 1)
        pixels[0, y] = tuple(round(a + (b - a) * t) for a, b in zip(top, bottom))
    canvas = line.resize((WIDTH, HEIGHT))
    grain = Image.effect_noise((WIDTH, HEIGHT), 6).convert("L")
    grain = ImageEnhance.Contrast(grain).enhance(0.3)
    texture = Image.merge("RGB", (grain, grain, grain))
    return Image.blend(canvas, texture, 0.025)


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def screenshot(path: Path) -> Image.Image:
    return Image.open(path).convert("RGB")


def repair_floating_control(
    image: Image.Image,
    center_y: int,
    *,
    solid: str | None = None,
) -> Image.Image:
    """Remove the simulator inspection control without touching app-owned UI."""
    clean = image.copy()
    box = (946, center_y - 132, 1206, center_y + 132)
    size = (box[2] - box[0], box[3] - box[1])
    if solid:
        patch = Image.new("RGB", size, solid)
    else:
        patch = clean.crop((650, box[1], 910, box[3])).resize(size, Image.Resampling.LANCZOS)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).ellipse((8, 6, size[0] - 1, size[1] - 7), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(18))
    clean.paste(patch, (box[0], box[1]), mask)
    return clean


def clear_debug_banner(image: Image.Image, *, fill: str) -> Image.Image:
    clean = image.copy()
    fade_top = 2180
    fade_bottom = 2320
    overlay = Image.new("RGB", clean.size, fill)
    mask = Image.new("L", clean.size, 0)
    draw = ImageDraw.Draw(mask)
    for y in range(fade_top, fade_bottom):
        alpha = round(255 * (y - fade_top) / (fade_bottom - fade_top))
        draw.line((0, y, clean.width, y), fill=alpha)
    draw.rectangle((0, fade_bottom, clean.width, clean.height), fill=255)
    clean.paste(overlay, (0, 0), mask)
    return clean


def phone(screen: Image.Image, width: int, angle: float = 0, *, crop_bottom: int = 0) -> Image.Image:
    ratio = 2622 / 1206
    screen_w = width - 34
    screen_h = round(screen_w * ratio)
    if crop_bottom:
        clean = screen.crop((0, 0, screen.width, screen.height - crop_bottom))
        clean = ImageOps.fit(clean, (screen_w, screen_h), method=Image.Resampling.LANCZOS, centering=(0.5, 0.0))
    else:
        clean = screen.resize((screen_w, screen_h), Image.Resampling.LANCZOS)

    frame_h = screen_h + 34
    device = Image.new("RGBA", (width, frame_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(device)
    draw.rounded_rectangle((0, 0, width - 1, frame_h - 1), radius=92, fill="#38383A", outline="#66666B", width=3)
    draw.rounded_rectangle((8, 8, width - 9, frame_h - 9), radius=86, fill="#050505")
    mask = rounded_mask((screen_w, screen_h), 76)
    device.paste(clean, (17, 17), mask)
    if angle:
        device = device.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    return device


def paste_with_shadow(canvas: Image.Image, layer: Image.Image, xy: tuple[int, int], blur: int = 34, opacity: int = 155) -> None:
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    alpha = layer.getchannel("A").point(lambda value: value * opacity // 255)
    shadow_shape = Image.new("RGBA", layer.size, (0, 0, 0, 255))
    shadow_shape.putalpha(alpha)
    shadow.alpha_composite(shadow_shape, (xy[0] + 8, xy[1] + 30))
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(shadow)
    canvas.alpha_composite(layer, xy)


def tracked(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, *, size: int = 31, fill: str = RED, spacing: int = 9) -> None:
    fnt = font(FONT_MONO, size)
    x, y = xy
    for char in text.upper():
        draw.text((x, y), char, font=fnt, fill=fill)
        x += draw.textlength(char, font=fnt) + spacing


def headline(draw: ImageDraw.ImageDraw, lines: list[str], *, y: int = 190, size: int = 118, accent_line: int | None = None) -> int:
    fnt = font(FONT_BLACK, size)
    x = 64
    line_gap = 8
    current_y = y
    for index, line in enumerate(lines):
        bbox = draw.textbbox((x, current_y), line, font=fnt)
        if accent_line == index:
            pad_x, pad_y = 20, 8
            draw.rounded_rectangle(
                (bbox[0] - pad_x, bbox[1] - pad_y, bbox[2] + pad_x, bbox[3] + pad_y),
                radius=18,
                fill=BONE,
            )
            fill = INK
        else:
            fill = BONE
        draw.text((x, current_y), line, font=fnt, fill=fill, stroke_width=1)
        current_y += bbox[3] - bbox[1] + line_gap
    return current_y


def pill(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, *, fill: str = RED, text_fill: str = "#FFFFFF") -> None:
    fnt = font(FONT_BOLD, 27)
    text_w = round(draw.textlength(text, font=fnt))
    x, y = xy
    draw.rounded_rectangle((x, y, x + text_w + 48, y + 64), radius=32, fill=fill)
    draw.text((x + 24, y + 15), text, font=fnt, fill=text_fill)


def add_brand(draw: ImageDraw.ImageDraw, canvas: Image.Image) -> None:
    icon = Image.open(ROOT / "assets/images/brand/icon.png").convert("RGBA").resize((84, 84), Image.Resampling.LANCZOS)
    canvas.alpha_composite(icon, (64, 64))
    draw.text((166, 71), "RFT", font=font(FONT_BLACK, 36), fill=BONE)
    tracked(draw, (166, 112), "RONIN FIGHT TEAM", size=15, fill=DIM, spacing=4)


def glow(canvas: Image.Image, center: tuple[int, int], radius: int, color: tuple[int, int, int, int]) -> None:
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse(
        (center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius),
        fill=color,
    )
    canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(radius // 2)))


def save(canvas: Image.Image, filename: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(OUT / filename, quality=95, subsampling=0, optimize=True)


def build_hero(home: Image.Image) -> None:
    photo = cover(Image.open(STORE / "source/rft-dojo-hero-v1.png"), (WIDTH, HEIGHT), focus_x=0.52, focus_y=0.48).convert("RGBA")
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    for y in range(1500):
        alpha = round(225 * (1 - y / 1500) ** 1.45)
        ImageDraw.Draw(overlay).line((0, y, WIDTH, y), fill=(0, 0, 0, alpha))
    ImageDraw.Draw(overlay).rectangle((0, 2150, WIDTH, HEIGHT), fill=(0, 0, 0, 72))
    photo.alpha_composite(overlay)
    draw = ImageDraw.Draw(photo)
    add_brand(draw, photo)
    tracked(draw, (64, 186), "LE CLUB EN DIRECT", size=28, fill=RED, spacing=8)
    headline(draw, ["TOUT TON CLUB.", "TOUTE TON ÉQUIPE."], y=236, size=94, accent_line=1)
    device = phone(home, 610, angle=-5)
    paste_with_shadow(photo, device, (-126, 910), blur=42, opacity=190)
    pill(draw, (720, 2310), "PLANNING · SALONS · COMBATS", fill=RED)
    draw.text((720, 2402), "L'app qui garde le club uni,\nsur le tatami comme en dehors.", font=font(FONT_BOLD, 30), fill=BONE, spacing=9)
    save(photo, "01-equipe.jpg")


def build_home(home: Image.Image) -> None:
    canvas = gradient_background((7, 7, 7), (20, 8, 7)).convert("RGBA")
    glow(canvas, (1050, 1280), 430, (200, 54, 45, 105))
    draw = ImageDraw.Draw(canvas)
    tracked(draw, (64, 82), "LA VIE DU CLUB", size=27, spacing=8)
    headline(draw, ["LE CLUB.", "DANS TA POCHE."], y=126, size=116, accent_line=1)
    draw.text((68, 486), "Annonces, planning, prochains rendez-vous :\ntout ce qui compte, au même endroit.", font=font(FONT_BOLD, 34), fill=DIM, spacing=8)
    device = phone(home, 940)
    paste_with_shadow(canvas, device, (151, 650), blur=44, opacity=185)
    pill(draw, (861, 2110), "EN DIRECT", fill=RED)
    save(canvas, "02-club.jpg")


def build_competitions(comp: Image.Image) -> None:
    canvas = gradient_background((7, 7, 7), (32, 7, 5)).convert("RGBA")
    glow(canvas, (170, 1720), 510, (142, 31, 24, 115))
    draw = ImageDraw.Draw(canvas)
    tracked(draw, (64, 82), "OBJECTIF COMPÉTITION", size=27, spacing=7)
    headline(draw, ["PROCHAINS COMBATS.", "EN LIGNE DE MIRE."], y=126, size=91, accent_line=1)
    device = phone(comp, 920, angle=4)
    paste_with_shadow(canvas, device, (190, 670), blur=46, opacity=190)
    pill(draw, (64, 2444), "DATES · INSCRIPTIONS · RÉSULTATS", fill=BONE, text_fill=INK)
    save(canvas, "03-competitions.jpg")


def build_chat(chat: Image.Image) -> None:
    canvas = gradient_background((6, 6, 6), (18, 12, 10)).convert("RGBA")
    glow(canvas, (1070, 1540), 460, (200, 54, 45, 110))
    draw = ImageDraw.Draw(canvas)
    tracked(draw, (64, 82), "LE TATAMI EN DIRECT", size=27, spacing=7)
    headline(draw, ["LE TATAMI", "RESTE OUVERT."], y=126, size=111, accent_line=1)
    draw.text((68, 474), "Messages, réactions et sondages pour\nfaire vivre l'équipe au quotidien.", font=font(FONT_BOLD, 34), fill=DIM, spacing=8)
    device = phone(chat, 940, angle=-3)
    paste_with_shadow(canvas, device, (218, 666), blur=44, opacity=190)
    pill(draw, (870, 1070), "SONDAGES", fill=GOLD, text_fill=INK)
    save(canvas, "04-messages.jpg")


def build_activity(activity: Image.Image) -> None:
    canvas = gradient_background((8, 7, 7), (29, 10, 7)).convert("RGBA")
    glow(canvas, (290, 1420), 500, (200, 54, 45, 95))
    draw = ImageDraw.Draw(canvas)
    tracked(draw, (64, 82), "TON PARCOURS SPORTIF", size=27, spacing=7)
    headline(draw, ["CHAQUE RÉSULTAT", "COMPTE."], y=126, size=104, accent_line=1)
    device = phone(activity, 940, angle=3)
    paste_with_shadow(canvas, device, (95, 650), blur=44, opacity=190)
    pill(draw, (70, 2428), "PODIUMS · PALMARÈS · PROGRESSION", fill=RED)
    save(canvas, "05-progression.jpg")


def build_themes(salons_dark: Image.Image, salons_light: Image.Image) -> None:
    canvas = gradient_background((9, 9, 9), (23, 8, 7)).convert("RGBA")
    glow(canvas, (1040, 1510), 520, (200, 54, 45, 95))
    draw = ImageDraw.Draw(canvas)
    tracked(draw, (64, 82), "UNE APP À TON IMAGE", size=27, spacing=7)
    headline(draw, ["TON CLUB.", "TON STYLE."], y=126, size=118, accent_line=1)
    draw.text((68, 470), "Passe du clair au sombre sans perdre\nl'identité Ronin Fight Team.", font=font(FONT_BOLD, 34), fill=DIM, spacing=8)
    dark_phone = phone(salons_dark, 780, angle=-8)
    light_phone = phone(salons_light, 780, angle=8)
    paste_with_shadow(canvas, dark_phone, (-220, 720), blur=42, opacity=180)
    paste_with_shadow(canvas, light_phone, (610, 700), blur=42, opacity=180)
    pill(draw, (64, 2440), "5 THÈMES AU CHOIX", fill=BONE, text_fill=INK)
    save(canvas, "06-themes.jpg")


def build_preview() -> None:
    files = sorted(OUT.glob("*.jpg"))
    thumbs = []
    for path in files:
        image = Image.open(path).convert("RGB")
        image.thumbnail((248, 537), Image.Resampling.LANCZOS)
        thumbs.append(image)
    preview = Image.new("RGB", (len(thumbs) * 278 + 30, 597), "#E9E9ED")
    for index, image in enumerate(thumbs):
        preview.paste(image, (30 + index * 278, 30))
    preview.save(STORE / "preview.jpg", quality=92, optimize=True)


def main() -> None:
    home = repair_floating_control(screenshot(SOURCE / "ios-accueil.png"), 2130)
    comp = repair_floating_control(screenshot(SOURCE / "ios-competitions.png"), 2130)
    chat = repair_floating_control(screenshot(SOURCE / "conversations/chat-dark.png"), 470, solid=INK)
    activity = clear_debug_banner(
        repair_floating_control(screenshot(SOURCE / "profile-activity/activity-dark.png"), 470),
        fill=INK,
    )
    salons_dark = clear_debug_banner(
        repair_floating_control(screenshot(SOURCE / "conversations/salons-dark.png"), 470),
        fill=INK,
    )
    salons_light = clear_debug_banner(
        repair_floating_control(screenshot(SOURCE / "conversations/salons-light.png"), 470),
        fill="#F5F2ED",
    )

    build_hero(home)
    build_home(home)
    build_competitions(comp)
    build_chat(chat)
    build_activity(activity)
    build_themes(salons_dark, salons_light)
    build_preview()

    print(f"Generated {len(list(OUT.glob('*.jpg')))} App Store screenshots in {OUT}")


if __name__ == "__main__":
    main()
