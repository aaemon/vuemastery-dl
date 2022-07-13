import os

rootdir = "./data"

if __name__ == "__main__":
	with open(os.path.join('./CoursesList.md'), 'w') as courses_list:
		for dir_name in os.listdir(rootdir):
			if os.path.isdir(os.path.join(rootdir, dir_name)):
				course_name=dir_name.title().replace('-',' ')
				courses_list.write(f"# {course_name}\n")
				courses_list.write(f"* [View on VueMastery.com](https://vuemastery.com/courses/{dir_name})\n")
				courses_list.write(f"* [Readme]({rootdir}/{dir_name}/Readme.md)\n\n")

				with open(os.path.join(rootdir, dir_name, 'data.txt'), 'r') as link_file, open(os.path.join(rootdir, dir_name, 'Readme.md'), 'w') as readme_file:
					readme_file.write(f"# {course_name}\n")
					readme_file.write(f"[View on VueMastery.com](https://vuemastery.com/courses/{dir_name})\n")
					for num, line in enumerate(link_file, start=1):
						readme_file.write(f"* [Lesson {num:02}]({line.strip()})\n")
