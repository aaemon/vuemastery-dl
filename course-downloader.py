import argparse
import json
import os
import random
import re
import time

import requests

video_link_regex = re.compile(r'https://player.vimeo.com/video/(?P<video_id>\d+)\?autoplay=1&app_id=(?P<app_id>\d+)')
player_config_regex = re.compile(r'(?:config = )(\{.*(\n.*?)*\"\})')

parser = argparse.ArgumentParser(description='Vue Mastery Downloader')
parser.add_argument('-q', '--quality', default=1080, type=int, help='Video quality, default is 1080')
parser.add_argument('-s', '--subtitle', action='store_true', help='download subtitles if available')
parser.add_argument('-l', '--language', default='en', type=str, help='Subtitle language code, default is en')


def get_video_info(url, quality=1080, language='en'):
	headers = {
		'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36',
		'Content-Type': 'application/x-www-form-urlencoded'
	}
	response = requests.get(url, headers=headers)

	player_config = json.loads(player_config_regex.findall(response.text)[0][0])

	result = {}

	largest_quality = 0
	largest_quality_link = 0
	for item in player_config['request']['files']['progressive']:
		if item['height'] >= largest_quality:
			largest_quality = item['height']
			largest_quality_link = item['url']

		if item['height'] == quality:
			result['video'] = item['url']

	# some lessons doesn't have 1080
	if not 'video' in result:
		result['video'] = largest_quality_link

	try:
		for item in player_config['request']['text_tracks']:
			if item['lang'] == language:
				result['subtitle'] = 'https://player.vimeo.com' + item['url']
	except:
		result['subtitle'] = ''

	result['title'] = player_config['video']['title']
	result['filename'] = result['title'].replace('/', '-')

	result['video-id'], result['application-id'] = video_link_regex.findall(url)[0]
	return result


if __name__ == "__main__":
	args = parser.parse_args()
	if os.path.isfile('data.txt'):
		with open('data.txt') as link_file:
			for video_page_link in link_file:
				video_page_link = video_page_link.strip()
				if not video_page_link or video_page_link == '' or video_page_link is None:
					continue

				video_info = get_video_info(video_page_link, language=args.language)

				print(video_info['title'], f": Downloading Video...")
				video_stream = requests.get(video_info['video'], allow_redirects=True, stream=True, )
				with open(f"{video_info['filename']}.mp4", 'wb') as f:
					for chunk in video_stream.iter_content(chunk_size=4096):
						if chunk:  # filter out keep-alive new chunks
							f.write(chunk)
				print(video_info['title'], f": Video Download Completed.")

				if args.subtitle:
					try:
						print(video_info['title'], f": Downloading Subtitle...")
						time.sleep(random.randint(1000, 4000))
						subtitle = requests.get(video_info['subtitle'], allow_redirects=True, )
						with open(f"{video_info['filename']}.vtt", 'wb') as f:
							f.write(subtitle.content)
						print(video_info['title'], f": Subtitle Download Completed.")
					except:
						with open(f"{video_info['filename']}.vtt", 'w') as f:
							f.write(video_info['subtitle'] or 'No Subtitles')
				else:
					with open(f"sub-list.txt", 'a') as f:
						f.write(f"{video_info['title']}\n")
						f.write(video_info['subtitle'] or 'No Subtitles')
						f.write("\n")
