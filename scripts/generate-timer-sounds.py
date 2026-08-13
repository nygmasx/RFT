import math
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 44_100
OUTPUT = Path(__file__).resolve().parents[1] / "assets" / "sounds"


def silence(duration: float) -> list[float]:
    return [0.0] * round(SAMPLE_RATE * duration)


def tone(frequencies: tuple[float, ...], duration: float, volume: float = 0.8) -> list[float]:
    count = round(SAMPLE_RATE * duration)
    samples: list[float] = []
    for index in range(count):
        time = index / SAMPLE_RATE
        attack = min(1.0, time / 0.008)
        decay = math.exp(-3.2 * time / duration)
        signal = sum(math.sin(2 * math.pi * frequency * time) for frequency in frequencies)
        samples.append(volume * attack * decay * signal / len(frequencies))
    return samples


def write(name: str, samples: list[float]) -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    target = OUTPUT / name
    with wave.open(str(target), "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(SAMPLE_RATE)
        frames = (struct.pack("<h", round(max(-1.0, min(1.0, sample)) * 32_767)) for sample in samples)
        audio.writeframes(b"".join(frames))
    print(f"Generated {target}")


write("timer-round.wav", tone((660, 990, 1320), 1.15, 0.95))
warning_beep = tone((1040, 1560), 0.18, 0.88)
write("timer-warning.wav", warning_beep + silence(0.12) + warning_beep)
finish_bell = tone((520, 780, 1040, 1560), 1.0, 0.95)
write("timer-finish.wav", finish_bell + silence(0.18) + finish_bell)
