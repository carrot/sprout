# Editing the man page

- Install [ronn](https://github.com/rtomayko/ronn) with `gem install ronn`
- Make changes to `sprout.1.ronn` in markdown
- Run `ronn man/sprout.1.ronn` which will compile it out
- To preview how it will look, run `man man/sprout.1`
