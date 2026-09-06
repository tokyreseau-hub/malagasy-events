import Foundation
import AVFoundation
import AppKit

let input = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)

let asset = AVURLAsset(url: input)
let duration = try await asset.load(.duration)
let seconds = CMTimeGetSeconds(duration)
let tracks = try await asset.loadTracks(withMediaType: .video)
guard let track = tracks.first else { fatalError("No video track") }
let size = try await track.load(.naturalSize)
let transform = try await track.load(.preferredTransform)
let displayed = size.applying(transform)
print("duration=\(seconds)")
print("size=\(abs(displayed.width))x\(abs(displayed.height))")

let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.maximumSize = NSSize(width: 540, height: 960)
generator.requestedTimeToleranceBefore = .zero
generator.requestedTimeToleranceAfter = .zero

let count = 12
for index in 0..<count {
    let fraction = Double(index) / Double(count - 1)
    let time = CMTime(seconds: max(0, min(seconds - 0.1, seconds * fraction)), preferredTimescale: 600)
    let image = try generator.copyCGImage(at: time, actualTime: nil)
    let bitmap = NSBitmapImageRep(cgImage: image)
    let data = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.82])!
    let file = output.appendingPathComponent(String(format: "frame-%02d.jpg", index + 1))
    try data.write(to: file)
}
