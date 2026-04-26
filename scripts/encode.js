const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');


ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const resolutions = [
  { name: '360p', size: '640x360', bitrate: '800k' },
  { name: '480p', size: '854x480', bitrate: '1200k' },
  { name: '720p', size: '1280x720', bitrate: '2500k' }
];

// Promisified ffprobe to get video duration
const getVideoDuration = (inputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
};

async function encodeVideo(inputPath, outputDir, baseName, contentId, updateProgress, taskId, episode) {
  console.log(typeof uploadQueue)
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const duration = await getVideoDuration(inputPath);
   
  const progressMap = {}

  await Promise.all(resolutions.map(({ name, size, bitrate }) => {
    return new Promise((resolve, reject) => {
      const resolutionDir = path.join(outputDir, name);
      if (!fs.existsSync(resolutionDir)) {
        fs.mkdirSync(resolutionDir, { recursive: true });
      }

      let lastLogged = 0;

      ffmpeg(inputPath)
        .addOptions([
          `-s ${size}`,
          `-b:v ${bitrate}`,
          '-hls_time 10',
          '-hls_list_size 0',
          '-f hls'
        ])
        .output(path.join(resolutionDir, `${baseName + name}.m3u8`))
        .on('progress', (progress) => {
            const timeParts = progress.timemark.split(':').map(parseFloat);
        const currentSeconds =
          timeParts[0] * 3600 +
          timeParts[1] * 60 +
          timeParts[2];

        const percent = Math.min((currentSeconds / duration) * 100, 100);

        if (percent - lastLogged >= 5 || percent === 100) {
          progressMap[name] = percent;

          const total =
            Object.values(progressMap).reduce((sum, val) => sum + val, 0) /
            resolutions.length;

           const scaled = Math.min(Math.round((total / 100) * 90), 90);

          updateProgress(scaled);

          lastLogged = percent;
        }
        })
        .on('end', () => {
          console.log(`[${name}] Encoding Complete`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`[${name}] Encoding Error:`, err);
          reject(err);
        })
        .run();
    });
  }));

  const masterPlaylistPath = path.join(outputDir, `${baseName}_master.m3u8`);

  let masterContent = '#EXTM3U\n';

  resolutions.forEach(({name, size, bitrate}) => {
    const [width, height] = size.split('x');

    masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(bitrate) * 1000},RESOLUTION=${width}x${height}\n`;
  masterContent += `${name}/${baseName + name}.m3u8\n\n`;
  }) 

  fs.writeFileSync(masterPlaylistPath, masterContent);

console.log('Master playlist created:', masterPlaylistPath);

try {
  const { uploadQueue } = require('../worker/src'); // ← import here, not top-level
  if (uploadQueue && typeof uploadQueue.add === 'function') {
    await uploadQueue.add('upload', { title:baseName, outputDir, contentId, taskId, episode }, {jobId: taskId});
    await fs.promises.rm(inputPath);
  } else {
    console.error("uploadQueue is not properly initialized.");
  }
} catch (err) {
  console.error("Failed to access uploadQueue:", err);
}
}

module.exports = {encodeVideo};