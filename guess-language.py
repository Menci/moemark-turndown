import pygments.lexers
import sys
data = '\n'.join(sys.stdin.readlines())
print(pygments.lexers.guess_lexer(data).name)
