# peril
Create and manage profiles containing files in /etc with sym-links.

## Wait. What?

"Peril" is a tool that creates adminstrative 'profiles' for *nix type
systems. Many of our embedded projects have a "recovery" profile that
starts up DHCP and HostAPD with a predefined WPA password. But for
normal operation we use the "nominal" profile with end-user defined
network and user settings.

"Peril" keeps the two sets of /etc files segregated by putting them in
different profiles. Each profile has a directory in /etc/peril that
profile's "real" files live. Instead of having "real" files in /etc,
we use sym-links.

So... for instance, let's say we wanted to have two profiles: recovery
and nominal. In the recovery profile you want no default user accounts
and to make sure HostAPD starts with a pre-configured WPA password. In
the nominal account you want to let the user configure their own
network settings and user accounts. Rather than having scripts that
copy default files and make backups when you enter each mode, we
create soft links from the "important" files like /etc/passwd,
/etc/hostapd.conf, etc. that point to the "real" files in
/etc/peril/<profile name>/<whatever>.

So for this example, our /etc directory would look something like this
in recovery mode:

    /etc/peril/current --symlink to--> /etc/peril/recovery
    /etc/passwd        --------------> /etc/peril/current/etc/passwd
    /etc/group         --------------> /etc/peril/current/etc/group
    /etc/rc?.d         --------------> /etc/peril/current/etc/rc?.d
    /etc/rc.local      --------------> /etc/peril/current/etc/rc.local
    
    /etc/peril/recovery/etc/passwd   <--- nominal profile's password file
    /etc/peril/recovery/etc/group    <--- nominal profile's groups file
    /etc/peril/recovery/etc/rc?.d    <--- contains links to nominal mode's init scripts
    /etc/peril/recovery/etc/rc.local <--- nominal mode's rc.local file

And then nominal mode would be the same, except the /etc/peril/current
link would point to the /etc/peril/nominal directory, which would
contain the "real" files for nominal mode.

This is a hack. But after trying to do the "right" thing by using
version control systems to hold config files I discovered that
sometimes hacks work better than doing things the "right" way.

Peril does not do version control. But it doesn't get in your way if
you want to put /etc/peril under version control. Please note,
however, most version control systems (*cough* *git* *cough*) don't
store user metadata, so you have to do post checkout user fixups
manually.

Peril can also make your system unusable if it fails in the middle of
a critical transaction. Please don't issue peril commands as your
system is rebooting.

## GURF! YOU'RE MODIFYING /etc ON THE FLY?

Well. Yes and no. You *can* issue peril commands that take effect
immediately (like adding or removing a file from a profile.) This is
probably a bad idea only if some process has the file open at the time
you add (or remove) it from the profile. It's not 100% safe, but it is
99% safe.

But doing things like changing the targets of various sym-links while
processes that depend on them may be a bad idea. So, by default, when
you tell peril to change the profile, it doesn't change the current
profile, it changes the "next" profile. "Next" as in "use this profile
the next time i reboot."

If you feel lucky, you can tell peril to make the current profile the
one pointed to by the next profile pointer.

## Profile Pointer, WTF?

Let's recap: systems have (potentially) multiple profiles. Each
profile may have different versions of the same file in it. We use
symlinks to link a file (like /etc/passwd) to a real file with real
contents in /etc/peril/<profile name> (like
/etc/peril/nominal/etc/passwd.)

But if you look at the profile description above, you'll notice that
the symlink we put at /etc/passwd doesn't point to
/etc/peril/nominal/etc/passwd, it points to
/etc/peril/current/etc/passwd. Then if you were able to look at the
rest of that list without falling asleep you might have noticed
/etc/peril/current points to the "real" profile directory.

By default, /etc/peril/current and /etc/peril/next are symbolic links
pointing to real profile directories. Operations that modify the
contents of a profile, like adding/removing a file, occur on the
"next" profile. Once you've made all the changes you want to make, you
change the "current" profile to point to the same profile as the
"next" profile.

Or, if you feel lucky, you can make the next pointer point to the
current pointer and hope that everything works out.

The way we do "recovery mode" in our systems is to check whether the
"recovery condition" is true at boot time (usually this means the
recovery button is being pressed at boot time, or the RECOVERY.TXT
file exists in the boot partition.) If so, we change the
/etc/peril/next to point to /etc/peril/nominal and /etc/peril/current
to point to /etc/peril/recovery. This causes the system to boot into
recovery mode (because the current profile pointer is pointing at
/etc/peril/recovery.)

## Doing Things with Peril

There are three classes of objects peril manipulates: profiles,
profile pointers and files. Profiles hold collections of
administrative files. Profiles are, in turn, linked to profile
pointers.

To list profiles, use the `peril profile list` command:

    *$* peril profile list
    recovery
    factory
    nominal

To create or delete a profile, use the `peril profile create <profile
name>` or `peril profile delete <profile name>` command:

    *$* peril profile create example
    *$* echo $?
    0
    *$* peril profile delete example

To add a file to a profile, use the `peril file add <file name>
[<profile name>]` command:

    *$* sudo peril file add /etc/passwd
    *$* echo $?
    0

If you don't include a profile name in the file add command, peril
will copy the existing file to all the profiles. If you add a file
that's already in a profile, peril will emit an error message on
stderr and give a return code of 2:

    *$* sudo peril file add /etc/passwd
    peril: file /etc/passwd is already in this profile
    *$* echo $?
    2

If you include a profile name in the file add command, it will only
copy the file to THAT profile:

    *$* sudo peril file add /etc/hostapd/hostapd.conf recovery
    *$* echo $?
    0

To remove a file from peril, use the `peril file rm <file name> [<profile name>]`
command:

    *$* sudo peril file rm /etc/hostapd/hostapd.conf
    *$* echo $?
    0

If you do not provide a profile name to the file rm command, it will
remove that file from all profiles and replace the peril-managed
symlink with the version of the file from the current profile.  If you
provide a profile name, it will only remove the file from THAT
profile. The original file will still be a symlink.

To get the path to the "real" file for a particular file, use the
`peril file ref <file name> [<profile name>]` command:

    *$* peril file ref /etc/passwd
    /etc/peril/nominal/etc/passwd

To get the path to a "real" file from a particular profile, do
something like this:

    *$* peril file ref /etc/passwd recovery
    /etc/peril/recovery/etc/passwd

But that shouldn't be too shocking.