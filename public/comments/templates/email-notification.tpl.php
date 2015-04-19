Hello <?php echo $this->to; ?>,

There are new replies to your comment(s):

<?php foreach($this->comments as $comment): ?>
At <?php echo $comment->getTimestamp(); ?>, <?php echo $comment->getAttribution(); ?> wrote:
<?php echo $comment->getContent(); ?>

<?php endforeach; ?>

Thanks,
<?php echo $this->from; ?>
