/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

// Put variables in global scope to make them available to the browser console.
const video = document.querySelector('video');
const canvas = window.canvas = document.querySelector('canvas');
const jimpImg = document.getElementById('jimpImg')
canvas.width = 480;
canvas.height = 360;

const button = document.querySelector('button');
const detectButton = document.getElementById('detectButton')
button.onclick = async function() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

  console.log('type of video', typeof video, video)

  const img = await Jimp.read(canvas.toDataURL())
  img.greyscale().contrast(0.5)


  jimpImg.src = await img.getBase64Async(Jimp.MIME_PNG)
};

detectButton.onclick = async function() {
  const mrz = await extractMrz(jimpImg)
  console.log('result >>>>', mrz)
  document.getElementById('result').innerText = JSON.stringify(mrz, null, 2)
}
const constraints = {
  video: {
    width: {
      min: 640,
      ideal: 1280,
      max: 1280
    },
    height: {
      min: 480,
      ideal: 960,
      max: 960
    },
    facingMode: "environment"
  }
};

function handleSuccess(stream) {
  window.stream = stream; // make stream available to browser console
  video.srcObject = stream;
}

function handleError(error) {
  console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
}

async function extractMrz(img) {
  console.log('[extractMrz] initializing...')
  console.time('[extractMrz]')

  Tesseract.setLogging(true)
  const worker = Tesseract.createWorker({
    langPath: "https://cdn.jsdelivr.net/gh/uwolfer/tesseract-mrz@master/lang/",
    logger: m => console.log(m),
  })

  console.time('[extractMrz] Load traineddata')
  await worker.load();
  await worker.loadLanguage('OCRB');
  await worker.initialize('OCRB');
  await worker.setParameters({
    load_system_dawg: "F",
    load_freq_dawg: "F",
    load_unambig_dawg: "F",
    load_punc_dawg: "F",
    load_number_dawg: "F",
    load_fixed_length_dawgs: "F",
    load_bigram_dawg: "F",
    wordrec_enable_assoc: "F",
    tessedit_pageseg_mode: "6",
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
  })
  console.timeEnd('[extractMrz] Load traineddata')

  console.time('[extractMrz] Scanning Image')
  const { data: { text } } = await worker.recognize(img);
  console.timeEnd('[extractMrz] Scanning Image')

  console.time('[extractMrz] Format result')
  const lines = text
    .split('\n')
    .filter(line => line.includes('<<'))
    .filter(text => text.length < 48)
    .filter(text => text.length > 28)
    .map(text => text.replace(/ /g, ''))

  console.timeEnd('[extractMrz] Format result')
  await worker.terminate();

  console.log('[extractMrz] Result: ', JSON.stringify(lines));
  console.timeEnd('[extractMrz]')
  return lines;
}

navigator.mediaDevices.getUserMedia(constraints).then(handleSuccess).catch(handleError);
