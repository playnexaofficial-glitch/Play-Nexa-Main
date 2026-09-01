import re
import os
import glob

files = glob.glob('src/app/admin/**/*.tsx', recursive=True)
files += glob.glob('src/components/admin/**/*.tsx', recursive=True)

for file in files:
    with open(file, 'r', encoding='utf8') as f:
        content = f.read()

    # active:opacity-XY -> active:opacity-60
    content = re.sub(r'active:opacity-\d{2,3}', 'active:opacity-60', content)
    
    # active:scale-95 etc -> maybe just add active:opacity-60
    
    # transition-colors -> transition-opacity
    content = content.replace('transition-colors', 'transition-opacity')
    
    # backdrop-blur-XX -> remove
    content = re.sub(r'backdrop-blur(?:-\w+)?', '', content)
    
    # replace multiple spaces with single space in classNames if needed, but whatever
    
    with open(file, 'w', encoding='utf8') as f:
        f.write(content)

